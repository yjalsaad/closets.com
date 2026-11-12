/* Shell route for the virtual showroom: /showroom-3d and /ar/showroom-3d (kept in its own tiny module so src/index.js and the tests share one regex). */
export const SHOWROOM_PATH_RE = /^(\/ar)?\/showroom-3d(\/|$)/i;
export const isShowroomPath = (p) => SHOWROOM_PATH_RE.test(p || '');
