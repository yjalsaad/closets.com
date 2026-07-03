// Test-only stub: three's /examples/jsm/* modules are ESM-only and Jest (CRA)
// can't parse them. Mapped in via package.json > jest.moduleNameMapper so the
// 3D scene components import cleanly under test. These classes are never used
// at test time (the 3D scenes only mount on the planner page, not on load).
export class OrbitControls {
  constructor() { this.target = { set() {} }; this.enableDamping = false; }
  update() {} dispose() {} addEventListener() {} removeEventListener() {}
}
export class RoomEnvironment { constructor() {} dispose() {} }
export default { OrbitControls, RoomEnvironment };
