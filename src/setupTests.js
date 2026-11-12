// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// jsdom has no canvas / WebGL: report "unsupported" quietly (getContext -> null) instead of printing "Not implemented" errors.
if (typeof HTMLCanvasElement !== 'undefined') { HTMLCanvasElement.prototype.getContext = () => null; }
