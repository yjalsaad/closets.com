/* CRC-32 (IEEE 802.3, the zlib / ZIP / openNURBS ON_CRC32 polynomial). Shared by the XLSX zip writer and the 3DM writer. */
let T = null;
export function crc32(bytes, start = 0) {
  if (!T) { T = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0; } }
  let c = (start ^ 0xffffffff) >>> 0;
  for (let i = 0; i < bytes.length; i++) c = T[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
