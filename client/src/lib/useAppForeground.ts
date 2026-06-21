import { useEffect } from 'react';
import { App } from '@capacitor/app';

export function useAppForeground(callback: () => void) {
  useEffect(() => {
    // Apenas no mobile/Capacitor o event listener funciona de verdade
    const listener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        callback();
      }
    });

    // Cleanup na desmontagem (embora este hook vá num componente de alto nível)
    return () => {
      listener.then(l => l.remove());
    };
  }, [callback]);
}
