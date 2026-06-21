import { useEffect, useState, useRef, useCallback } from 'react';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
import { Capacitor } from '@capacitor/core';
import { useAppForeground } from './useAppForeground';

export function useBiometricGuard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const isPrompting = useRef(false);
  const hasFailed = useRef(false);

  const authenticate = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      setIsAuthenticated(true); // Na web passa direto (ideal para dev)
      return;
    }

    if (isPrompting.current) return;
    isPrompting.current = true;

    try {
      const info = await BiometricAuth.checkBiometry();
      if (!info.isAvailable) {
        setIsSupported(false);
        setIsAuthenticated(true); // Se não suporta, falha aberto para não travar o app (ou poderia travar, mas fail-open é melhor pra web fallback)
        isPrompting.current = false;
        return;
      }

      await BiometricAuth.authenticate({
        reason: 'Desbloqueie o Diário para visualizar suas entradas',
        cancelTitle: 'Cancelar',
        iosFallbackTitle: 'Usar senha',
      });

      setIsAuthenticated(true);
      setError(null);
      hasFailed.current = false;
    } catch (err: any) {
      setIsAuthenticated(false);
      setError(err.message || 'Erro ao tentar autenticar.');
      hasFailed.current = true;
    } finally {
      // Pequeno delay para garantir que o evento de resume termine antes de liberar
      setTimeout(() => {
        isPrompting.current = false;
      }, 1000);
    }
  }, []);

  useEffect(() => {
    authenticate();
  }, []);

  // Ao voltar pro app (do background), exige biometria novamente se estiver nesta página
  useAppForeground(() => {
    if (!isPrompting.current && isAuthenticated && !hasFailed.current) {
      setIsAuthenticated(false);
      authenticate();
    }
  });

  return { isAuthenticated, authenticate, error, isSupported };
}
