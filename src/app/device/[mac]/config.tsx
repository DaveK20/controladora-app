import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ToastView, useToast } from '@/components/toast';
import { C, DIAS, NUM_SETORES } from '@/constants/irrigation';
import { BottomTabInset } from '@/constants/theme';
import { useApp } from '@/contexts/AppContext';
import { getConfig, saveConfig } from '@/services/firebase';

export default function DeviceConfigScreen() {
  const { mac } = useLocalSearchParams<{ mac: string }>();
  const { uid } = useApp();
  const insets = useSafeAreaInsets();
  const { toast, show: showToast } = useToast();

  const [horaInicio, setHoraInicio]     = useState(6);
  const [minutoInicio, setMinutoInicio] = useState(0);
  const [tempos, setTempos] = useState<number[][]>(() =>
    Array.from({ length: 7 }, () => Array(NUM_SETORES).fill(0)),
  );
  const [diaAtivo, setDiaAtivo] = useState(0);
  const [saving, setSaving]     = useState(false);
  const [loading, setLoading]   = useState(true);

  const loadConfig = useCallback(async () => {
    if (!uid || !mac) return;
    setLoading(true);
    try {
      const cfg = await getConfig(uid, mac);
      if (!cfg) {
        showToast('Nenhuma configuração encontrada — usando padrões.', 'info');
        return;
      }
      setHoraInicio(cfg.horaInicio);
      setMinutoInicio(cfg.minutoInicio);
      const t: number[][] = Array.from({ length: 7 }, () => Array(NUM_SETORES).fill(0));
      for (let d = 0; d < 7; d++) {
        const row = cfg.tempos[d] ?? [];
        for (let s = 0; s < Math.min(row.length, NUM_SETORES); s++) t[d][s] = row[s] ?? 0;
      }
      setTempos(t);
    } catch (e: unknown) {
      Alert.alert('Erro ao carregar', e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [uid, mac]);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const handleSave = async () => {
    if (!uid || !mac) return;
    setSaving(true);
    try {
      await saveConfig(uid, mac, { horaInicio, minutoInicio, tempos });
      showToast('Configuração salva com sucesso!');
    } catch (e: unknown) {
      Alert.alert('Erro ao salvar', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const updateTempo = (setor: number, val: string) => {
    const n = Math.max(0, parseInt(val) || 0);
    setTempos((prev) => {
      const next = prev.map((row) => [...row]);
      next[diaAtivo][setor] = n;
      return next;
    });
  };

  const diaTemTempo = (d: number) => tempos[d].some((t) => t > 0);

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
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ToastView toast={toast} />

      <ScrollView
        style={s.scroll}
        contentInset={{ ...insets, bottom: bottomPad }}
        contentContainerStyle={contentPlatformStyle}>

        <View style={s.header}>
          <Text style={s.title}>⚙️ Configuração</Text>
          {loading && <Text style={s.loadingText}>↻ Sincronizando...</Text>}
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Horário de Início</Text>
          <View style={s.row}>
            <View style={s.flex1}>
              <Text style={s.label}>Hora</Text>
              <TextInput
                style={s.input}
                value={horaInicio.toString()}
                onChangeText={(v) => setHoraInicio(Math.min(23, Math.max(0, parseInt(v) || 0)))}
                keyboardType="numeric"
              />
            </View>
            <View style={s.flex1}>
              <Text style={s.label}>Minuto</Text>
              <TextInput
                style={s.input}
                value={minutoInicio.toString()}
                onChangeText={(v) => setMinutoInicio(Math.min(59, Math.max(0, parseInt(v) || 0)))}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>🌿 Tempo por Setor (min)</Text>
          <Text style={s.labelMuted}>Tempo 0 = setor inativo naquele dia.</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.dayTabsRow}>
            {DIAS.map((dia, d) => {
              const selecionado = d === diaAtivo;
              const temTempo    = diaTemTempo(d);
              return (
                <TouchableOpacity
                  key={d}
                  onPress={() => setDiaAtivo(d)}
                  style={[
                    s.dayTab,
                    temTempo && { borderColor: C.verde },
                    selecionado && !temTempo && { backgroundColor: C.azul, borderColor: C.azul },
                    selecionado && temTempo  && { backgroundColor: C.verde, borderColor: C.verde },
                  ]}>
                  <Text style={[s.dayTabText, selecionado && { color: '#fff' }]}>{dia}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={s.sectorGrid}>
            {Array.from({ length: NUM_SETORES }, (_, i) => (
              <View key={i} style={s.sectorCell}>
                <Text style={s.sectorLabel}>Setor {i + 1}</Text>
                <TextInput
                  style={[s.input, { marginTop: 4 }]}
                  value={tempos[diaAtivo][i].toString()}
                  onChangeText={(v) => updateTempo(i, v)}
                  keyboardType="numeric"
                  placeholder="min"
                  placeholderTextColor={C.textMuted}
                />
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[s.btn, s.btnVerde, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}>
          <Text style={s.btnText}>{saving ? '⏳ Salvando...' : '💾 Salvar'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: C.bg },

  header:      { marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:       { fontSize: 20, fontWeight: 'bold', color: C.verde },
  loadingText: { fontSize: 11, color: C.azul },

  card:      { backgroundColor: C.card, borderRadius: 8, padding: 12, marginBottom: 10 },
  cardTitle: { color: C.azul, fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 8 },
  label:     { color: C.text, fontSize: 13, marginTop: 6 },
  labelMuted:{ color: C.textMuted, fontSize: 11, marginBottom: 8 },
  input:     { backgroundColor: C.input, color: C.text, borderRadius: 4, borderWidth: 1, borderColor: '#555', paddingHorizontal: 8, paddingVertical: 6, fontSize: 14 },
  row:       { flexDirection: 'row', gap: 8 },
  flex1:     { flex: 1 },

  dayTabsRow: { marginVertical: 8 },
  dayTab:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 5, borderWidth: 2, borderColor: '#555', marginRight: 6 },
  dayTabText: { color: C.text, fontSize: 13 },

  sectorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sectorCell: { width: '47.5%', backgroundColor: C.input, padding: 8, borderRadius: 6, borderWidth: 1, borderColor: 'transparent' },
  sectorLabel:{ color: C.textSec, fontSize: 12 },

  btn:        { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 6, alignItems: 'center', marginTop: 4 },
  btnText:    { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  btnVerde:   { backgroundColor: C.verde },
});
