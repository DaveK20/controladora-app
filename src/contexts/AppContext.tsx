import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import { claimDevice, ClaimResult, Status, subscribeStatus } from '@/services/firebase';

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

const MAC_KEY = 'controladora_mac';
const OFFLINE_THRESHOLD_MS = 45_000;

// ─── Validação de MAC ─────────────────────────────────────────────────────────

export function isValidMac(mac: string): boolean {
  return /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(mac.trim());
}

export function normalizeMac(mac: string): string {
  return mac.trim().toUpperCase();
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface AppCtx {
  uid: string | null;
  mac: string | null;
  macLoading: boolean;
  connectMac: (mac: string) => Promise<ClaimResult>;
  clearMac: () => Promise<void>;
  status: Status | null;
  online: boolean;
}

const Ctx = createContext<AppCtx>({
  uid: null,
  mac: null,
  macLoading: true,
  connectMac: async () => 'claimed',
  clearMac: async () => {},
  status: null,
  online: false,
});

// ─── Provider ────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const [mac, setMac]               = useState<string | null>(null);
  const [macLoading, setMacLoading] = useState(true);
  const [status, setStatus]         = useState<Status | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  // Carrega o MAC salvo localmente ao iniciar (ou quando o uid muda)
  useEffect(() => {
    if (!uid) {
      setMac(null);
      setMacLoading(false);
      return;
    }
    setMacLoading(true);
    storage.getItem(`${MAC_KEY}_${uid}`).then((stored) => {
      setMac(stored ?? null);
      setMacLoading(false);
    });
  }, [uid]);

  // Conecta o listener de status sempre que uid ou mac mudam
  useEffect(() => {
    unsubRef.current?.();
    unsubRef.current = null;
    setStatus(null);

    if (!uid || !mac) return;

    unsubRef.current = subscribeStatus(uid, mac, setStatus, (err) =>
      console.warn('subscribeStatus error:', err),
    );

    return () => {
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [uid, mac]);

  // Reivindica o dispositivo e salva o MAC localmente
  const connectMac = async (value: string): Promise<ClaimResult> => {
    if (!uid) return 'taken';
    const normalized = normalizeMac(value);
    const result = await claimDevice(uid, normalized);
    if (result !== 'taken') {
      await storage.setItem(`${MAC_KEY}_${uid}`, normalized);
      setMac(normalized);
    }
    return result;
  };

  const clearMac = async () => {
    if (uid) await storage.deleteItem(`${MAC_KEY}_${uid}`);
    setMac(null);
  };

  const online =
    status?.online === true &&
    status.ultimaVez !== null &&
    Date.now() - (status.ultimaVez ?? 0) < OFFLINE_THRESHOLD_MS;

  return (
    <Ctx.Provider value={{ uid, mac, macLoading, connectMac, clearMac, status, online }}>
      {children}
    </Ctx.Provider>
  );
}

export const useApp = () => useContext(Ctx);
