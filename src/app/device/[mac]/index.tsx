import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
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
import { C, DIAS } from '@/constants/irrigation';
import { BottomTabInset } from '@/constants/theme';
import { useApp } from '@/contexts/AppContext';
import { useDeviceMac } from '@/contexts/DeviceMacContext';
import { formatMacDisplay } from '@/lib/mac';
import { desvincularDispositivo, renameController, sendCommand, Status, subscribeStatus } from '@/services/firebase';

const OFFLINE_THRESHOLD_MS = 90 * 60_000; // heartbeat do ESP32 é a cada 1h — margem confortável acima disso

function hwDotColor(ok: boolean | undefined): string {
  if (ok === undefined) return '#888';
  return ok ? C.verde : C.vermelho;
}

export default function DeviceStatusScreen() {
  const mac = useDeviceMac();
  const { uid, nomes, setLastOpenedMac } = useApp();
  const insets = useSafeAreaInsets();
  const { toast, show: showToast } = useToast();

  const [status, setStatus]         = useState<Status | null>(null);
  const [cmdPending, setCmdPending] = useState(false);
  const [unlinking, setUnlinking]   = useState(false);
  const [renaming, setRenaming]     = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [novoNome, setNovoNome]     = useState('');

  const nome = mac ? nomes[mac] : undefined;

  useEffect(() => {
    if (!uid || !mac) return;
    return subscribeStatus(uid, mac, setStatus, (err) => console.warn('subscribeStatus error:', err));
  }, [uid, mac]);

  const online = !!status?.online
    && status.ultimaVez !== null
    && Date.now() - (status.ultimaVez ?? 0) < OFFLINE_THRESHOLD_MS;
  const isIrrigando = status?.irrigando ?? false;
  const totalSeg    = (status?.tempoConfMin ?? 0) * 60;
  const pct = isIrrigando && totalSeg > 0
    ? Math.max(0, Math.min(100, Math.round((1 - status!.restaSeg / totalSeg) * 100)))
    : 0;
  const restMin = Math.floor((status?.restaSeg ?? 0) / 60);
  const restSec = (status?.restaSeg ?? 0) % 60;

  const handleCommand = (acao: 'iniciar' | 'parar') => {
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
      showToast(acao === 'iniciar' ? 'Comando de início enviado!' : 'Comando de parada enviado!');
    } catch (e: unknown) {
      Alert.alert('Erro ao enviar comando', e instanceof Error ? e.message : String(e));
    } finally {
      setCmdPending(false);
    }
  };

  const handleDesvincular = () => {
    if (!mac) return;
    Alert.alert(
      'Desvincular dispositivo',
      `Remover ${formatMacDisplay(mac)} da sua conta? O ESP32 vai precisar de um novo código pra parear de novo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Desvincular', style: 'destructive', onPress: doDesvincular },
      ],
    );
  };

  const doDesvincular = async () => {
    if (!mac) return;
    setUnlinking(true);
    try {
      await desvincularDispositivo(mac);
      await setLastOpenedMac(null);
      router.replace('/');
    } catch (e: unknown) {
      Alert.alert('Erro ao desvincular', e instanceof Error ? e.message : String(e));
      setUnlinking(false);
    }
  };

  const handleRenomear = () => {
    setNovoNome(nome ?? '');
    setRenameOpen(true);
  };

  const salvarNome = async () => {
    if (!uid || !mac) return;
    setRenaming(true);
    try {
      await renameController(uid, mac, novoNome);
      setRenameOpen(false);
      showToast('Apelido salvo!');
    } catch (e: unknown) {
      Alert.alert('Erro ao renomear', e instanceof Error ? e.message : String(e));
    } finally {
      setRenaming(false);
    }
  };

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
          <View>
            <Text style={s.title}>💧 {nome || (mac ? formatMacDisplay(mac) : '')}</Text>
            {!!nome && mac && <Text style={s.macSec}>{formatMacDisplay(mac)}</Text>}
            <TouchableOpacity onPress={() => router.replace('/')}>
              <Text style={s.backLink}>← Voltar à lista</Text>
            </TouchableOpacity>
          </View>
          <View>
            <View style={s.onlineRow}>
              <View style={[s.onlineDot, { backgroundColor: online ? C.verde : '#888' }]} />
              <Text style={[s.onlineText, { color: online ? C.verde : C.textMuted }]}>
                {online ? 'Online' : 'Offline'}
              </Text>
            </View>
            {status && (
              <View style={[s.onlineRow, { marginTop: 4 }]}>
                <View style={[s.onlineDot, { backgroundColor: hwDotColor(status.rtcOk) }]} />
                <Text style={[s.onlineText, { color: C.textMuted }]}>RTC</Text>
                <View style={[s.onlineDot, { backgroundColor: hwDotColor(status.sdOk), marginLeft: 8 }]} />
                <Text style={[s.onlineText, { color: C.textMuted }]}>SD</Text>
                {status.fluxoSensorOk && (
                  <>
                    <View style={[s.onlineDot, { backgroundColor: hwDotColor(status.fluxoDetectado), marginLeft: 8 }]} />
                    <Text style={[s.onlineText, { color: C.textMuted }]}>Fluxo</Text>
                  </>
                )}
              </View>
            )}
          </View>
        </View>

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
                <Text style={[s.statusVal, { color: C.verde }]}>Setor {status.setorAtual + 1}</Text>
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

            {status.fluxoSensorOk && status.fluxoDetectado === false && (
              <View style={s.avisoFluxo}>
                <Text style={s.avisoFluxoTexto}>
                  ⚠ Fluxo de água não detectado — o tempo não está sendo contado
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={[s.statusBox, { backgroundColor: '#4a5568' }]}>
            <Text style={[s.statusTitle, { color: '#fff' }]}>
              {online ? '⏸ Aguardando próximo ciclo' : '⏸ Sistema inativo'}
            </Text>
          </View>
        )}

        <View style={s.actionRow}>
          <TouchableOpacity
            style={[s.btn, s.btnLaranja, (cmdPending || !online || isIrrigando) && { opacity: 0.5 }]}
            onPress={() => handleCommand('iniciar')}
            disabled={cmdPending || !online || isIrrigando}>
            <Text style={s.btnText}>▶ Iniciar agora</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.btn, s.btnVermelho, (cmdPending || !online || !isIrrigando) && { opacity: 0.5 }]}
            onPress={() => handleCommand('parar')}
            disabled={cmdPending || !online || !isIrrigando}>
            <Text style={s.btnText}>⏹ Parar</Text>
          </TouchableOpacity>
        </View>

        <View style={s.rodapeAcoes}>
          <TouchableOpacity onPress={handleRenomear}>
            <Text style={s.renomearText}>✏️ Renomear</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.desvincularBtn} onPress={handleDesvincular} disabled={unlinking}>
            <Text style={s.desvincularText}>
              {unlinking ? 'Desvinculando...' : 'Desvincular dispositivo'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={renameOpen} transparent animationType="fade" onRequestClose={() => setRenameOpen(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitulo}>Apelido do dispositivo</Text>
            <TextInput
              style={s.modalInput}
              value={novoNome}
              onChangeText={setNovoNome}
              placeholder={mac ? formatMacDisplay(mac) : ''}
              placeholderTextColor={C.textMuted}
              autoFocus
              maxLength={40}
            />
            <View style={s.modalBotoes}>
              <TouchableOpacity style={s.modalBtnCancelar} onPress={() => setRenameOpen(false)} disabled={renaming}>
                <Text style={s.modalBtnCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalBtnSalvar} onPress={salvarNome} disabled={renaming}>
                <Text style={s.modalBtnSalvarText}>{renaming ? 'Salvando...' : 'Salvar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: C.bg },

  header:      { marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title:       { fontSize: 18, fontWeight: 'bold', color: C.verde },
  macSec:      { color: C.textMuted, fontSize: 11, fontFamily: 'monospace', marginTop: 1 },
  backLink:    { color: C.textMuted, fontSize: 12, marginTop: 4 },
  onlineRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  onlineDot:   { width: 8, height: 8, borderRadius: 4 },
  onlineText:  { fontSize: 12 },

  statusBox:    { borderRadius: 8, marginBottom: 10, padding: 12 },
  statusTitle:  { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  statusGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statusItem:   { backgroundColor: C.statusItem, padding: 8, borderRadius: 5, flexBasis: '48%', flexGrow: 1 },
  statusLabel:  { color: C.textMuted, fontSize: 11 },
  statusVal:    { color: C.text, fontSize: 14, fontWeight: 'bold' },
  progressBg:   { backgroundColor: C.statusItem, borderRadius: 4, height: 8, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: C.verde },
  progressLabel:{ color: C.textMuted, fontSize: 11, textAlign: 'right', marginTop: 2 },

  avisoFluxo:       { backgroundColor: '#5c1a1a', borderRadius: 8, borderWidth: 1, borderColor: C.vermelho, padding: 10, marginTop: 10 },
  avisoFluxoTexto:  { color: C.vermelho, fontSize: 12, fontWeight: 'bold', textAlign: 'center' },

  actionRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginVertical: 10 },

  btn:        { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6 },
  btnText:    { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  btnLaranja: { backgroundColor: C.laranja },
  btnVermelho:{ backgroundColor: C.vermelho },

  rodapeAcoes:     { alignItems: 'center', marginTop: 12, gap: 10 },
  renomearText:    { color: C.azul, fontSize: 13 },
  desvincularBtn:  { alignItems: 'center' },
  desvincularText: { color: C.textMuted, fontSize: 13 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  modalCard:    { backgroundColor: C.card, borderRadius: 12, padding: 20, gap: 14 },
  modalTitulo:  { color: C.text, fontSize: 16, fontWeight: 'bold' },
  modalInput: {
    backgroundColor: C.input,
    color: C.text,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  modalBotoes:         { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalBtnCancelar:    { paddingVertical: 8, paddingHorizontal: 12 },
  modalBtnCancelarText:{ color: C.textMuted, fontSize: 14 },
  modalBtnSalvar:      { backgroundColor: C.verde, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 },
  modalBtnSalvarText:  { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});
