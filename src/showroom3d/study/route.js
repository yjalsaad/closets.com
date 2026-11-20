/* /yas-bloom/study and /ar/yas-bloom/study: the study page inside the VIP room (noindex like the whole showroom: vercel.json header + ShowroomRoot meta tag). */
export const STUDY_PATH_RE = /^(\/ar)?\/yas-bloom\/study\/?$/i;
export const isStudyPath = (p) => STUDY_PATH_RE.test(p || '');
