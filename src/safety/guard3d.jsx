// guard3d.jsx — wrap a 3D component so that (a) a device without WebGL gets a clear message + non-3D alternative and
// (b) a context-creation / render error inside the canvas is contained to that canvas instead of blanking the page.
import WebGLGate from './WebGLGate';

export default function guard3D(Component, name) {
  const Guarded = (props) => (
    <WebGLGate name={name} inline fallback={props.fallback}>
      <Component {...props} />
    </WebGLGate>
  );
  Guarded.displayName = 'Guarded(' + name + ')';
  return Guarded;
}
