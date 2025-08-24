import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

export function useRefetchOnFocus(cb: () => void) {
  useEffect(() => {
    if (Platform.OS === 'web') {
      const onFocus = () => cb();
      const onVisibility = () => {
        if (document.visibilityState === 'visible') cb();
      };
      const onOnline = () => cb();

      window.addEventListener('focus', onFocus);
      document.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('online', onOnline);

      return () => {
        window.removeEventListener('focus', onFocus);
        document.removeEventListener('visibilitychange', onVisibility);
        window.removeEventListener('online', onOnline);
      };
    } else {
      const sub = AppState.addEventListener('change', (state) => {
        if (state === 'active') cb();
      });
      return () => sub.remove();
    }
  }, [cb]);
}
