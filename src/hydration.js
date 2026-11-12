// True only while the prerendered markup is being hydrated (set by src/index.js, cleared once the first commit has
// finished). Components whose first render depends on the browser (viewport width, localStorage) read it so that the
// FIRST client render matches the prerendered HTML (which is crawled at desktop width with no saved user), then
// switch to the real value in an effect. Outside hydration (plain client render, route changes) it is false, so
// there is no extra flash.
export const hydration = { active: false };
