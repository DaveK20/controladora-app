import React, { createContext, useContext, useEffect, useState } from 'react';

import { auth, onAuthStateChanged, resetPassword, signIn, signOut, signUp, User } from '@/services/auth';

interface AuthCtx {
  user: User | null;
  authLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  authLoading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  resetPassword: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
  }, []);

  return (
    <Ctx.Provider value={{ user, authLoading, signIn, signUp, signOut, resetPassword }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
