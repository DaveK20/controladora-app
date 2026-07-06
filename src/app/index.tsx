import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C } from '@/constants/irrigation';
import { BottomTabInset } from '@/constants/theme';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatMacDisplay } from '@/lib/mac';
import { Status, subscribeStatus } from '@/services/firebase';

const OFFLINE_THRESHOLD_MS = 90 * 60_000; // heartbeat do ESP32 é a cada 1h — margem confortável acima disso

// Evita que "Voltar à lista" (navegação explícita dentro da mesma sessão do
// app) seja imediatamente redirecionado de volta pro último dispositivo — o
// atalho de abrir direto só vale uma vez por sessão (cold start).
let jaAbriuAutomaticamente = false;

function useDeviceStatus(uid: string | null, mac: string) {
  const [status, setStatus] = useState<Status | null>(null);
  useEffect(() => {
    if (!uid) return;
    return subscribeStatus(uid, mac, setStatus);
  }, [uid, mac]);
  return status;
}

function DeviceItem({ uid, mac, nome, onPress }: { uid: string; mac: string; nome?: string; onPress: () => void }) {
  const status = useDeviceStatus(uid, mac);
  const online = !!status?.online
    && status.ultimaVez !== null
    && Date.now() - (status.ultimaVez ?? 0) < OFFLINE_THRESHOLD_MS;

  let linha = 'Offline';
  if (online) {
    linha = status?.irrigando ? `Irrigando — Setor ${status.setorAtual + 1}` : 'Aguardando próximo ciclo';
  }

  return (
    <TouchableOpacity style={s.item} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={s.itemMac}>{nome || formatMacDisplay(mac)}</Text>
        {!!nome && <Text style={s.itemMacSec}>{formatMacDisplay(mac)}</Text>}
        <Text style={[s.itemStatus, online && { color: C.verde }]}>{linha}</Text>
      </View>
      <View style={[s.dot, { backgroundColor: online ? C.verde : '#888' }]} />
    </TouchableOpacity>
  );
}

export default function DispositivosScreen() {
  const { uid, macs, macsLoading, nomes, lastOpenedMac } = useApp();
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [checked, setChecked] = useState(jaAbriuAutomaticamente);

  useEffect(() => {
    if (jaAbriuAutomaticamente) { setChecked(true); return; }
    if (macsLoading) return;
    jaAbriuAutomaticamente = true;
    if (lastOpenedMac && macs.includes(lastOpenedMac)) {
      router.replace({ pathname: '/device/[mac]', params: { mac: lastOpenedMac } });
      return;
    }
    setChecked(true);
  }, [macsLoading, lastOpenedMac, macs]);

  if (!checked) {
    return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  }

  const bottomPad = insets.bottom + BottomTabInset + 16;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: bottomPad }]}>

        <View style={s.header}>
          <Text style={s.title}>💧 Meus dispositivos</Text>
          <TouchableOpacity onPress={signOut}>
            <Text style={s.sairLink}>Sair</Text>
          </TouchableOpacity>
        </View>

        {macs.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyText}>Nenhum dispositivo vinculado ainda.</Text>
            <Text style={s.emptyHint}>Toque em "+" para parear seu primeiro ESP32.</Text>
          </View>
        )}

        {macs.map((mac) => (
          <DeviceItem
            key={mac}
            uid={uid!}
            mac={mac}
            nome={nomes[mac]}
            onPress={() => router.push({ pathname: '/device/[mac]', params: { mac } })}
          />
        ))}
      </ScrollView>

      <TouchableOpacity style={s.fab} onPress={() => router.push('/adicionar-dispositivo')}>
        <Text style={s.fabText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  scroll:  { flex: 1, backgroundColor: C.bg },
  content: { padding: 16 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title:  { fontSize: 20, fontWeight: 'bold', color: C.verde },
  sairLink: { color: C.textMuted, fontSize: 13 },

  empty:     { backgroundColor: C.card, borderRadius: 10, padding: 20, alignItems: 'center', gap: 6 },
  emptyText: { color: C.textSec, fontSize: 15, textAlign: 'center' },
  emptyHint: { color: C.textMuted, fontSize: 13, textAlign: 'center' },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  itemMac:    { color: C.text, fontSize: 16, fontWeight: 'bold' },
  itemMacSec: { color: C.textMuted, fontSize: 11, fontFamily: 'monospace', marginTop: 1 },
  itemStatus: { color: C.textMuted, fontSize: 13, marginTop: 2 },
  dot:        { width: 10, height: 10, borderRadius: 5, marginLeft: 10 },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.verde,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 30 },
});
