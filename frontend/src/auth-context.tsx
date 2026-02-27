import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { authApi, setApiUnauthorizedHandler } from './lib/api';
import { getJwtExpirationMs, isJwtExpired } from './lib/jwt';
import { tokenStorage } from './lib/storage';
import { ApiError, User } from './types';

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (input: { email: string; password: string }) => Promise<void>;
  register: (input: { email: string; password: string; name: string; phone: string }) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const SESSION_EXPIRED_MESSAGE = 'Session expired. Please sign in again.';

const toMessage = (error: unknown): string => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as ApiError).message);
  }

  return 'Unexpected error';
};

export function AuthProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const logoutTimerRef = useRef<number | null>(null);

  const clearLogoutTimer = (): void => {
    if (logoutTimerRef.current) {
      window.clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  };

  const applySessionTimers = (): void => {
    clearLogoutTimer();

    const refreshToken = tokenStorage.getRefreshToken();
    const expiresAt = getJwtExpirationMs(refreshToken);
    if (!expiresAt) {
      return;
    }

    const delayMs = Math.max(0, expiresAt - Date.now());
    logoutTimerRef.current = window.setTimeout(() => {
      tokenStorage.clear();
      setUser(null);
      setError(SESSION_EXPIRED_MESSAGE);
    }, delayMs);
  };

  useEffect(() => {
    setApiUnauthorizedHandler(() => {
      clearLogoutTimer();
      setUser(null);
      setError(SESSION_EXPIRED_MESSAGE);
    });

    return () => {
      setApiUnauthorizedHandler(null);
      clearLogoutTimer();
    };
  }, []);

  useEffect(() => {
    const bootstrap = async (): Promise<void> => {
      const accessToken = tokenStorage.getAccessToken();
      const refreshToken = tokenStorage.getRefreshToken();

      if (!accessToken || !refreshToken) {
        setIsLoading(false);
        return;
      }

      if (isJwtExpired(refreshToken)) {
        tokenStorage.clear();
        setError(SESSION_EXPIRED_MESSAGE);
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await authApi.me();
        setUser(currentUser);
        applySessionTimers();
      } catch {
        tokenStorage.clear();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    void bootstrap();
  }, []);

  const login = async (input: { email: string; password: string }): Promise<void> => {
    setError(null);
    const response = await authApi.login(input);
    tokenStorage.setTokens(response);
    setUser(response.user);
    applySessionTimers();
  };

  const register = async (input: { email: string; password: string; name: string; phone: string }): Promise<void> => {
    setError(null);
    const response = await authApi.register(input);
    tokenStorage.setTokens(response);
    setUser(response.user);
    applySessionTimers();
  };

  const logout = async (): Promise<void> => {
    setError(null);
    try {
      await authApi.logout();
    } catch {
      // no-op: local cleanup should always happen
    } finally {
      clearLogoutTimer();
      tokenStorage.clear();
      setUser(null);
    }
  };

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isLoading,
    error,
    isAuthenticated: Boolean(user && tokenStorage.getAccessToken() && tokenStorage.getRefreshToken()),
    async login(input): Promise<void> {
      try {
        await login(input);
      } catch (err) {
        setError(toMessage(err));
        throw err;
      }
    },
    async register(input): Promise<void> {
      try {
        await register(input);
      } catch (err) {
        setError(toMessage(err));
        throw err;
      }
    },
    async logout(): Promise<void> {
      await logout();
    },
    clearError(): void {
      setError(null);
    },
  }), [error, isLoading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextValue => {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return value;
};
