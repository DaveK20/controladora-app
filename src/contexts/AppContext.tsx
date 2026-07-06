import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import { subscribeControllers } from '@/services/firebase';

// expo-secure-store não funciona na web — usa localStorage como fallback
const storage = {
  getItem: (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') return Promise.resolve(localStorage.getItem(key));
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') { localStorage.setItem(key, value); return Promise.resolve(); }
    return SecureStore.setItemAsync(key, value);
  },
  deleteItem: (key: string): Promise<void> => {
    if (Platform.OS === 'web') { localStorage.removeItem(key); return Promise.resolve(); }
    return SecureStore.deleteItemAsync(key);
  },
};

const LAST_DEVICE_KEY = 'ultimo_dispositivo';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface AppCtx {
  uid: string | null;
  macs: string[];
  macsLoading: boolean;
  nomes: Record<string, string>;
  // Último dispositivo aberto — só um atalho de navegação (abrir direto nele
  // ao logar), não é mais um gate de funcionalidade como antes.
  lastOpenedMac: string | null;
  lastOpenedLoading: boolean;
  setLastOpenedMac: (mac: string | null) => Promise<void>;
}

const Ctx = createContext<AppCtx>({
  uid: null,
  macs: [],
  macsLoading: true,
  nomes: {},
  lastOpenedMac: null,
  lastOpenedLoading: true,
  setLastOpenedMac: async () => {},
});

// ─── Provider ────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const [macs, setMacs]                       = useState<string[]>([]);
  const [macsLoading, setMacsLoading]         = useState(true);
  const [nomes, setNomes]                     = useState<Record<string, string>>({});
  const [lastOpenedMac, setLastOpenedMacState] = useState<string | null>(null);
  const [lastOpenedLoading, setLastOpenedLoading] = useState(true);
  const unsubRef = useRef<(() => void) | null>(null);

  // Lista de dispositivos vinculados à conta (tempo real)
  useEffect(() => {
    unsubRef.current?.();
    unsubRef.current = null;
    setMacs([]);

    if (!uid) {
      setMacsLoading(false);
      return;
    }

    setMacsLoading(true);
    unsubRef.current = subscribeControllers(
      uid,
      (list, listNomes) => { setMacs(list); setNomes(listNomes); setMacsLoading(false); },
      (err) => { console.warn('subscribeControllers error:', err); setMacsLoading(false); },
    );

    return () => {
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [uid]);

  // Carrega o último dispositivo aberto (atalho de navegação) ao logar
  useEffect(() => {
    if (!uid) {
      setLastOpenedMacState(null);
      setLastOpenedLoading(false);
      return;
    }
    setLastOpenedLoading(true);
    storage.getItem(`${LAST_DEVICE_KEY}_${uid}`).then((stored) => {
      setLastOpenedMacState(stored ?? null);
      setLastOpenedLoading(false);
    });
  }, [uid]);

  const setLastOpenedMac = useCallback(async (mac: string | null) => {
    setLastOpenedMacState((prev) => {
      if (prev === mac) return prev;
      return mac;
    });
    if (!uid) return;
    if (mac) await storage.setItem(`${LAST_DEVICE_KEY}_${uid}`, mac);
    else await storage.deleteItem(`${LAST_DEVICE_KEY}_${uid}`);
  }, [uid]);

  return (
    <Ctx.Provider value={{ uid, macs, macsLoading, nomes, lastOpenedMac, lastOpenedLoading, setLastOpenedMac }}>
      {children}
    </Ctx.Provider>
  );
}

export const useApp = () => useContext(Ctx);
