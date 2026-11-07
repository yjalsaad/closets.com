/* Room Visualizer — photo compositor [ROOM-VIZ 2026-11-07]
 * WebGL: photo → for each marked surface, the product pattern projected through a homography (perspective-correct),
 * masked (brush), and multiplied by the photo's own (blurred) light so shadows and highlights stay. */
const VS = `attribute vec2 a; varying vec2 v; void main(){ v = vec2(a.x*0.5+0.5, 0.5-a.y*0.5); gl_Position = vec4(a,0.0,1.0); }`;
const FS_PHOTO = `precision highp float; varying vec2 v; uniform sampler2D uPhoto; void main(){ gl_FragColor = texture2D(uPhoto, v); }`;
const FS_SURF = `precision highp float; varying vec2 v;
uniform sampler2D uTex; uniform sampler2D uMask; uniform sampler2D uBlur;
uniform mat3 uH; uniform vec2 uImg; uniform vec2 uOrigin; uniform vec2 uSpan; uniform float uShade; uniform float uMean; uniform float uFlat; uniform vec3 uColor; uniform float uGloss;
void main(){
  vec2 px = v * uImg;
  vec3 p = uH * vec3(px, 1.0);
  if (p.z <= 0.0) discard;
  vec2 m = p.xy / p.z;
  vec2 t = (m - uOrigin) / uSpan;
  if (t.x < 0.0 || t.y < 0.0 || t.x > 1.0 || t.y > 1.0) discard;
  float a = texture2D(uMask, v).r;
  if (a < 0.004) discard;
  vec3 col = uFlat > 0.5 ? uColor : texture2D(uTex, t).rgb;
  vec3 b = texture2D(uBlur, v).rgb; float l = dot(b, vec3(0.299, 0.587, 0.114));
  float s = clamp(l / max(uMean, 0.02), 0.18, 1.75);
  col *= mix(1.0, s, uShade);
  col += uGloss * max(0.0, s - 1.1) * 0.5;
  gl_FragColor = vec4(col, a);
}`;

function compile(gl, type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
function program(gl, fs) { const p = gl.createProgram(); gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VS)); gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs)); gl.bindAttribLocation(p, 0, 'a'); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; }

/** homography H (3x3, row-major) with H·[x y 1] ~ [u v 1] for 4 point pairs src[i] -> dst[i] */
export function homography(src, dst) {
  const A = []; const b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i], [u, w] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -w * x, -w * y]); b.push(w);
  }
  const n = 8; const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    const d = M[c][c]; if (Math.abs(d) < 1e-12) return null;
    for (let k = c; k <= n; k++) M[c][k] /= d;
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  const h = M.map((r) => r[n]); return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

export function createCompositor(canvas) {
  const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, premultipliedAlpha: false, antialias: true });
  if (!gl) throw new Error('webgl');
  const pPhoto = program(gl, FS_PHOTO), pSurf = program(gl, FS_SURF);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const tex = (src, { repeat = false, mip = false } = {}) => {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    const pot = (n) => (n & (n - 1)) === 0;
    const canMip = mip && pot(src.width) && pot(src.height);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, canMip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE);
    if (canMip) gl.generateMipmap(gl.TEXTURE_2D);
    return t;
  };
  let photoT = null, blurT = null, size = [1, 1];
  const surf = new Map();   // id -> { tex, mask, ... }
  const upd = (t, src) => { gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); };
  return {
    gl,
    setPhoto(img, blurCanvas) {
      size = [img.width, img.height]; canvas.width = img.width; canvas.height = img.height;
      if (photoT) gl.deleteTexture(photoT); if (blurT) gl.deleteTexture(blurT);
      photoT = tex(img); blurT = tex(blurCanvas);
    },
    setSurface(id, o) {
      let s = surf.get(id);
      if (!s) { s = {}; surf.set(id, s); }
      if (o.pattern) { if (s.tex) gl.deleteTexture(s.tex); s.tex = tex(o.pattern); }
      if (o.mask) { if (s.mask) upd(s.mask, o.mask); else s.mask = tex(o.mask); }
      Object.assign(s, { H: o.H || s.H, origin: o.origin || s.origin, span: o.span || s.span, shade: o.shade ?? s.shade, mean: o.mean ?? s.mean, flat: o.flat ?? s.flat, color: o.color || s.color, gloss: o.gloss ?? s.gloss, order: o.order ?? s.order });
    },
    removeSurface(id) { const s = surf.get(id); if (s) { if (s.tex) gl.deleteTexture(s.tex); if (s.mask) gl.deleteTexture(s.mask); surf.delete(id); } },
    draw() {
      if (!photoT) return;
      gl.viewport(0, 0, canvas.width, canvas.height); gl.disable(gl.BLEND);
      gl.useProgram(pPhoto); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, photoT); gl.uniform1i(gl.getUniformLocation(pPhoto, 'uPhoto'), 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(pSurf);
      const U = (n) => gl.getUniformLocation(pSurf, n);
      [...surf.values()].filter((s) => s.H && s.mask && (s.tex || s.flat)).sort((a, b) => (a.order || 0) - (b.order || 0)).forEach((s) => {
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, s.tex || photoT); gl.uniform1i(U('uTex'), 0);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, s.mask); gl.uniform1i(U('uMask'), 1);
        gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, blurT); gl.uniform1i(U('uBlur'), 2);
        const h = s.H; gl.uniformMatrix3fv(U('uH'), false, new Float32Array([h[0], h[3], h[6], h[1], h[4], h[7], h[2], h[5], h[8]]));
        gl.uniform2f(U('uImg'), size[0], size[1]); gl.uniform2f(U('uOrigin'), s.origin[0], s.origin[1]); gl.uniform2f(U('uSpan'), s.span[0], s.span[1]);
        gl.uniform1f(U('uShade'), s.shade ?? 0.7); gl.uniform1f(U('uMean'), s.mean ?? 0.5); gl.uniform1f(U('uFlat'), s.flat ? 1 : 0);
        gl.uniform3f(U('uColor'), ...(s.color || [0.8, 0.8, 0.8])); gl.uniform1f(U('uGloss'), s.gloss || 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      });
    },
    snapshot(type = 'image/jpeg', q = 0.9) { this.draw(); return canvas.toDataURL(type, q); },
    dispose() { surf.forEach((_, id) => this.removeSurface(id)); if (photoT) gl.deleteTexture(photoT); if (blurT) gl.deleteTexture(blurT); const ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); },
  };
}

/** inverse of a 3x3 row-major matrix */
export function inv3(m) {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C; if (Math.abs(det) < 1e-12) return null;
  return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
}
