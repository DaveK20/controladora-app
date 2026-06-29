import React, { useCallback, useEffect, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApp } from '@/contexts/AppContext';
import { C } from '@/constants/irrigation';
import { BottomTabInset } from '@/constants/theme';
import { getLogs, LogEntry } from '@/services/firebase';

export default function LogsScreen() {
  const { uid, mac } = useApp();
  const insets = useSafeAreaInsets();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const carregar = useCallback(async () => {
    if (!uid || !mac) return;
    setLoading(true);
    setError(false);
    try {
      const data = await getLogs(uid, mac);
      setLogs(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [mac]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const bottomPad = insets.bottom + BottomTabInset + 16;
  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top + 8,
      paddingLeft: insets.left + 12,
      paddingRight: insets.right + 12,
      paddingBottom: bottomPad,
    },
    default: { padding: 12 },
  });

  return (
    <ScrollView
      style={s.scroll}
      contentInset={{ ...insets, bottom: bottomPad }}
      contentContainerStyle={contentPlatformStyle}>

      <Text style={s.title}>📋 Logs de Irrigação</Text>

      {error && (
        <View style={[s.infoBox, { borderColor: C.vermelho }]}>
          <Text style={[s.infoText, { color: C.vermelho }]}>Erro ao carregar logs.</Text>
        </View>
      )}

      {!error && !loading && logs.length === 0 && (
        <View style={s.infoBox}>
          <Text style={s.infoText}>Nenhum log encontrado.</Text>
          <Text style={[s.infoText, { fontSize: 12, marginTop: 4, color: C.textMuted }]}>
            Os logs aparecerão aqui após o ESP32 registrar ciclos no Firebase.
          </Text>
        </View>
      )}

      {logs.map((entry, i) => (
        <View key={i} style={s.logItem}>
          <View style={s.logRow}>
            <Text style={s.logData}>{entry.data}</Text>
            {entry.horaInicio && <Text style={s.logHora}>{entry.horaInicio}</Text>}
          </View>
          <Text style={s.logNome}>{entry.nome}</Text>
          {entry.motivo && (
            <Text style={s.logMotivo}>
              {entry.motivo === 'automatico' ? '🕐 Automático'
                : entry.motivo === 'manual' ? '👆 Manual'
                : entry.motivo === 'parado_manualmente' ? '⏹ Parado manualmente'
                : entry.motivo}
            </Text>
          )}
        </View>
      ))}

      <TouchableOpacity
        style={[s.btn, loading && { opacity: 0.5 }]}
        onPress={carregar}
        disabled={loading}>
        <Text style={s.btnText}>{loading ? '⏳ Carregando...' : '🔄 Atualizar'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: C.bg },
  title: { fontSize: 18, fontWeight: 'bold', color: C.azul, marginBottom: 10, textTransform: 'uppercase' },
  infoBox: { backgroundColor: C.card, borderRadius: 8, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#555' },
  infoText: { color: C.textSec, fontSize: 14 },
  logItem: { backgroundColor: C.card, borderRadius: 8, padding: 12, marginBottom: 8, gap: 4 },
  logRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logData: { color: C.verde, fontSize: 13, fontWeight: 'bold' },
  logHora: { color: C.textMuted, fontSize: 12 },
  logNome: { color: C.text, fontSize: 14 },
  logMotivo: { color: C.textSec, fontSize: 12 },
  btn: { backgroundColor: '#7f8c8d', borderRadius: 6, paddingHorizontal: 16, paddingVertical: 10, alignSelf: 'flex-start', marginTop: 4 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});
