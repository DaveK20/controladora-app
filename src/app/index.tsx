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

import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { C, DIAS, NUM_SETORES } from '@/constants/irrigation';
import { BottomTabInset } from '@/constants/theme';
import { getConfig, saveConfig, sendCommand } from '@/services/firebase';

export default function IrrigacaoScreen() {
  const { uid, mac, status, online, clearMac } = useApp();
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const [horaInicio, setHoraInicio] = useState(6);
  const [minutoInicio, setMinutoInicio] = useState(0);
  const [tempos, setTempos] = useState<number[][]>(() =>
    Array.from({ length: 7 }, () => Array(NUM_SETORES).fill(0)),
  );
  const [diaAtivo, setDiaAtivo] = useState(0);
  const [saving, setSaving] = useState(false);
  const [cmdPending, setCmdPending] = useState(false);

  const loadConfig = useCallback(async () => {
    if (!uid || !mac) return;
    try {
      const cfg = await getConfig(uid, mac);
      if (!cfg) return;
      setHoraInicio(cfg.horaInicio);
      setMinutoInicio(cfg.minutoInicio);
      const t: number[][] = Array.from({ length: 7 }, () => Array(NUM_SETORES).fill(0));
      for (let d = 0; d < 7; d++) {
        const row = cfg.tempos[d] ?? [];
        for (let s = 0; s < Math.min(row.length, NUM_SETORES); s++) {
          t[d][s] = row[s] ?? 0;
        }
      }
      setTempos(t);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar a configuração.');
    }
  }, [uid, mac]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Navega automaticamente para o dia ativo quando a irrigação está em curso
  useEffect(() => {
    if (status?.irrigando && status.diaCiclo !== undefined) {
      setDiaAtivo(status.diaCiclo);
    }
  }, [status?.irrigando, status?.diaCiclo]);

  const handleSave = async () => {
    if (!uid || !mac) return;
    setSaving(true);
    try {
      await saveConfig(uid, mac, { horaInicio, minutoInicio, tempos });
      Alert.alert('Salvo!', 'Configuração enviada ao Firebase.');
    } catch {
      Alert.alert('Erro', 'Falha ao salvar configuração.');
    } finally {
      setSaving(false);
    }
  };

  const handleCommand = async (acao: 'iniciar' | 'parar') => {
    if (!mac) return;
    if (acao === 'parar') {
      Alert.alert('Confirmar', 'Deseja realmente parar a irrigação?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Parar', style: 'destructive', onPress: () => dispatchCommand('parar') },
      ]);
      return;
    }
    dispatchCommand(acao);
  };

  const dispatchCommand = async (acao: 'iniciar' | 'parar') => {
    if (!uid || !mac) return;
    setCmdPending(true);
    try {
      await sendCommand(uid, mac, acao);
    } catch {
      Alert.alert('Erro', 'Não foi possível enviar o comando. Verifique a conexão.');
    } finally {
      setCmdPending(false);
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

  // Status
  const isIrrigando = status?.irrigando ?? false;
  const totalSeg = (status?.tempoConfMin ?? 0) * 60;
  const pct =
    isIrrigando && totalSeg > 0
      ? Math.max(0, Math.min(100, Math.round((1 - status!.restaSeg / totalSeg) * 100)))
      : 0;
  const restMin = Math.floor((status?.restaSeg ?? 0) / 60);
  const restSec = (status?.restaSeg ?? 0) % 60;

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

      {/* Header com indicador de conectividade */}
      <View style={s.header}>
        <Text style={s.title}>💧 Irrigação</Text>
        <View style={s.onlineRow}>
          <View style={[s.onlineDot, { backgroundColor: online ? C.verde : '#888' }]} />
          <Text style={[s.onlineText, { color: online ? C.verde : C.textMuted }]}>
            {online ? 'Controladora online' : 'Controladora offline'}
          </Text>
        </View>
      </View>

      {/* Status box */}
      {status === null ? (
        <View style={[s.statusBox, { backgroundColor: C.card }]}>
          <Text style={[s.statusTitle, { color: C.textMuted }]}>⏳ Aguardando status...</Text>
        </View>
      ) : isIrrigando ? (
        <View style={[s.statusBox, { backgroundColor: C.statusAtivo, borderColor: C.verde, borderWidth: 2 }]}>
          <Text style={[s.statusTitle, { color: C.verde }]}>💧 Irrigando</Text>
          <View style={s.statusGrid}>
            <View style={s.statusItem}>
              <Text style={s.statusLabel}>Setor atual</Text>
              <Text style={[s.statusVal, { color: C.verde }]}>Setor {status.setorAtual}</Text>
            </View>
            <View style={s.statusItem}>
              <Text style={s.statusLabel}>Dia do ciclo</Text>
              <Text style={s.statusVal}>{DIAS[status.diaCiclo ?? 0]}</Text>
            </View>
            <View style={s.statusItem}>
              <Text style={s.statusLabel}>Tempo restante</Text>
              <Text style={s.statusVal}>{restMin}min {restSec}s</Text>
            </View>
            <View style={s.statusItem}>
              <Text style={s.statusLabel}>Tempo configurado</Text>
              <Text style={s.statusVal}>{status.tempoConfMin} min</Text>
            </View>
          </View>
          <View style={s.progressBg}>
            <View style={[s.progressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={s.progressLabel}>{pct}% concluído</Text>
        </View>
      ) : (
        <View style={[s.statusBox, { backgroundColor: '#4a5568' }]}>
          <Text style={[s.statusTitle, { color: '#fff' }]}>⏸ Sistema inativo</Text>
        </View>
      )}

      {/* Comando pendente */}
      {cmdPending && (
        <View style={s.pendingBox}>
          <Text style={s.pendingText}>⏳ Enviando comando ao Firebase...</Text>
        </View>
      )}

      {/* Horário de início */}
      <View style={s.card}>
        <Text style={s.cardTitle}>⚙️ Horário de Início</Text>
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

      {/* Setores por dia */}
      <View style={s.card}>
        <Text style={s.cardTitle}>🌿 Tempo por Setor (min) — por dia</Text>
        <Text style={s.labelMuted}>Tempo 0 = setor inativo naquele dia.</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.dayTabsRow}>
          {DIAS.map((dia, d) => {
            const selecionado    = d === diaAtivo;
            const temTempo       = diaTemTempo(d);
            const esDiaIrrigando = isIrrigando && status?.diaCiclo === d;
            return (
              <TouchableOpacity
                key={d}
                onPress={() => setDiaAtivo(d)}
                style={[
                  s.dayTab,
                  temTempo && { borderColor: C.verde },
                  selecionado && !temTempo && { backgroundColor: C.azul, borderColor: C.azul },
                  selecionado && temTempo  && { backgroundColor: C.verde, borderColor: C.verde },
                  esDiaIrrigando && { borderColor: C.verde, borderWidth: 2 },
                ]}>
                <Text style={[s.dayTabText, selecionado && { color: '#fff' }]}>
                  {esDiaIrrigando ? '💧 ' : ''}{dia}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={s.sectorGrid}>
          {Array.from({ length: NUM_SETORES }, (_, i) => {
            // Destaca o setor ativo independentemente da aba de dia selecionada
            const isAtivo = isIrrigando && status?.setorAtual === i + 1;
            return (
              <View
                key={i}
                style={[
                  s.sectorCell,
                  isAtivo && { borderColor: C.verde, borderWidth: 2, backgroundColor: C.badgeAtivo },
                ]}>
                {isAtivo && <Text style={s.activeBadge}>💧</Text>}
                <Text style={[s.sectorLabel, isAtivo && { color: C.verde, fontWeight: 'bold' }]}>
                  Setor {i + 1}
                </Text>
                <TextInput
                  style={[s.input, { marginTop: 4 }, isAtivo && { borderColor: C.verde }]}
                  value={tempos[diaAtivo][i].toString()}
                  onChangeText={(v) => updateTempo(i, v)}
                  keyboardType="numeric"
                  placeholder="min"
                  placeholderTextColor={C.textMuted}
                />
              </View>
            );
          })}
        </View>
      </View>

      {/* Botões */}
      <View style={s.actionRow}>
        <TouchableOpacity style={[s.btn, s.btnVerde]} onPress={handleSave} disabled={saving}>
          <Text style={s.btnText}>{saving ? '⏳' : '💾'} Salvar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.btn, s.btnLaranja, cmdPending && { opacity: 0.5 }]}
          onPress={() => handleCommand('iniciar')}
          disabled={cmdPending}>
          <Text style={s.btnText}>▶ Iniciar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.btn, s.btnVermelho, cmdPending && { opacity: 0.5 }]}
          onPress={() => handleCommand('parar')}
          disabled={cmdPending}>
          <Text style={s.btnText}>⏹ Parar</Text>
        </TouchableOpacity>
      </View>

      {/* Conta */}
      <View style={s.contaRow}>
        <TouchableOpacity onPress={clearMac}>
          <Text style={s.contaLink}>Trocar controladora</Text>
        </TouchableOpacity>
        <Text style={s.contaSep}>·</Text>
        <TouchableOpacity onPress={signOut}>
          <Text style={s.contaLink}>Sair da conta</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: C.bg },

  header: { marginBottom: 10, gap: 4 },
  title: { fontSize: 20, fontWeight: 'bold', color: C.verde },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  onlineText: { fontSize: 12 },

  statusBox: { borderRadius: 8, marginBottom: 10, padding: 12 },
  statusTitle: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statusItem: { backgroundColor: C.statusItem, padding: 8, borderRadius: 5, flexBasis: '48%', flexGrow: 1 },
  statusLabel: { color: C.textMuted, fontSize: 11 },
  statusVal: { color: C.text, fontSize: 14, fontWeight: 'bold' },
  progressBg: { backgroundColor: C.statusItem, borderRadius: 4, height: 8, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: C.verde },
  progressLabel: { color: C.textMuted, fontSize: 11, textAlign: 'right', marginTop: 2 },

  pendingBox: { backgroundColor: '#3d2f00', borderRadius: 8, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: C.amarelo },
  pendingText: { color: C.amarelo, fontSize: 13, textAlign: 'center' },

  card: { backgroundColor: C.card, borderRadius: 8, padding: 12, marginBottom: 10 },
  cardTitle: { color: C.azul, fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 8 },
  label: { color: C.text, fontSize: 13, marginTop: 6 },
  labelMuted: { color: C.textMuted, fontSize: 11, marginBottom: 8 },
  input: { backgroundColor: C.input, color: C.text, borderRadius: 4, borderWidth: 1, borderColor: '#555', paddingHorizontal: 8, paddingVertical: 6, fontSize: 14 },
  row: { flexDirection: 'row', gap: 8 },
  flex1: { flex: 1 },

  dayTabsRow: { marginVertical: 8 },
  dayTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 5, borderWidth: 2, borderColor: '#555', marginRight: 6 },
  dayTabText: { color: C.text, fontSize: 13 },

  sectorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sectorCell: { width: '47.5%', backgroundColor: C.input, padding: 8, borderRadius: 6, borderWidth: 1, borderColor: 'transparent' },
  sectorLabel: { color: C.textSec, fontSize: 12 },
  activeBadge: { position: 'absolute', top: 4, right: 6, fontSize: 12 },

  actionRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginVertical: 10 },
  contaRow:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 8 },
  contaLink: { color: C.textMuted, fontSize: 13 },
  contaSep:  { color: C.textMuted, fontSize: 13 },
  btn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  btnVerde: { backgroundColor: C.verde },
  btnLaranja: { backgroundColor: C.laranja },
  btnVermelho: { backgroundColor: C.vermelho },
});
