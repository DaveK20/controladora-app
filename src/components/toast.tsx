import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { C } from '@/constants/irrigation';

type ToastTipo = 'ok' | 'info' | 'erro';
interface ToastData { msg: string; tipo: ToastTipo }

const TOAST_BG: Record<ToastTipo, string> = {
  ok:   '#1a5c30',
  info: '#1a3a5c',
  erro: '#5c1a1a',
};
const TOAST_BORDER: Record<ToastTipo, string> = {
  ok:   C.verde,
  info: C.azul,
  erro: C.vermelho,
};

export function useToast() {
  const [toast, setToast] = useState<ToastData | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((msg: string, tipo: ToastTipo = 'ok') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ msg, tipo });
    timer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return { toast, show };
}

export function ToastView({ toast }: { toast: ToastData | null }) {
  if (!toast) return null;
  return (
    <View style={[s.toast, { backgroundColor: TOAST_BG[toast.tipo], borderColor: TOAST_BORDER[toast.tipo] }]}>
      <Text style={[s.toastText, { color: TOAST_BORDER[toast.tipo] }]}>
        {toast.tipo === 'ok' ? '✓ ' : toast.tipo === 'info' ? 'ℹ ' : '✕ '}{toast.msg}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    zIndex: 100,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  toastText: { fontSize: 14, fontWeight: '600' },
});
