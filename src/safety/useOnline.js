import { useEffect, useState } from 'react';
export const isOnline = () => (typeof navigator === 'undefined' || navigator.onLine !== false);
export function useOnline() {
  const [on, setOn] = useState(isOnline);
  useEffect(() => {
    const u = () => setOn(true); const d = () => setOn(false);
    window.addEventListener('online', u); window.addEventListener('offline', d);
    return () => { window.removeEventListener('online', u); window.removeEventListener('offline', d); };
  }, []);
  return on;
}
