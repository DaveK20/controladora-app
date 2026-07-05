import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { C } from '@/constants/irrigation';
import { useApp } from '@/contexts/AppContext';
import { gerarCodigoVinculacao } from '@/services/firebase';

type Estado = 'carregando' | 'exibindo_codigo' | 'expirado' | 'erro';

export default function AdicionarDispositivoScreen() {
  const { macs, setLastOpenedMac } = useApp();
  const [estado, setEstado]           = useState<Estado>('carregando');
  const [code, setCode]               = useState('');
  const [restanteSeg, setRestanteSeg] = useState(0);
  const [erro, setErro]               = useState('');

  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const macsAntesRef = useRef<Set<string>>(new Set(macs));

  const gerarCodigo = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setEstado('carregando');
    setErro('');
    try {
      const { code: novoCodigo, expiraMinutos } = await gerarCodigoVinculacao();
      setCode(novoCodigo);
      setRestanteSeg(expiraMinutos * 60);
      setEstado('exibindo_codigo');
      timerRef.current = setInterval(() => {
        setRestanteSeg((seg) => {
          if (seg <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setEstado('expirado');
            return 0;
          }
          return seg - 1;
        });
      }, 1000);
    } catch (e: unknown) {
      // Erro real da chamada (ex: função não encontrada, sem permissão, sem
      // rede) — mostrado na própria tela, não só em Alert (que não aparece
      // no build web).
      console.warn('gerarCodigoVinculacao falhou:', e);
      setErro(e instanceof Error ? e.message : String(e));
      setEstado('erro');
    }
  };

  useEffect(() => {
    macsAntesRef.current = new Set(macs);
    gerarCodigo();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detecta vinculação: escuta a lista de dispositivos (via contexto) e
  // navega assim que surge um MAC que não existia antes de abrir esta tela.
  useEffect(() => {
    const novo = macs.find((m) => !macsAntesRef.current.has(m));
    if (!novo) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setLastOpenedMac(novo).then(() =>
      router.replace({ pathname: '/device/[mac]', params: { mac: novo } }),
    );
  }, [macs, setLastOpenedMac]);

  const min = Math.floor(restanteSeg / 60);
  const seg = restanteSeg % 60;

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.inner}>
        <Text style={s.emoji}>🔗</Text>
        <Text style={s.titulo}>Adicionar dispositivo</Text>

        {estado === 'carregando' && <Text style={s.subtitulo}>Gerando código...</Text>}

        {estado === 'erro' && (
          <View style={s.erroBox}>
            <Text style={s.erroTitulo}>Não foi possível gerar o código</Text>
            <Text style={s.erroTexto}>{erro}</Text>
          </View>
        )}

        {(estado === 'exibindo_codigo' || estado === 'expirado') && (
          <View style={s.codeCard}>
            <Text style={s.code}>{code}</Text>
            {estado === 'exibindo_codigo' ? (
              <Text style={s.timer}>Expira em {min}:{seg.toString().padStart(2, '0')}</Text>
            ) : (
              <Text style={s.expirado}>Código expirado</Text>
            )}
          </View>
        )}

        {estado !== 'carregando' && (
          <>
            {estado !== 'erro' && (
              <View style={s.instrucoes}>
                <Text style={s.instrucaoItem}>1. Conecte ao Wi-Fi "irrigacao-setup"</Text>
                <Text style={s.instrucaoItem}>2. Abra o navegador em 192.168.4.1</Text>
                <Text style={s.instrucaoItem}>3. Preencha o Wi-Fi, a senha e o código acima</Text>
                <Text style={s.instrucaoItem}>4. Toque em "Conectar e Vincular"</Text>
              </View>
            )}

            <TouchableOpacity style={s.btn} onPress={gerarCodigo}>
              <Text style={s.btnTexto}>{estado === 'erro' ? 'Tentar novamente' : 'Gerar novo código'}</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={s.cancelarBtn} onPress={() => router.back()}>
          <Text style={s.cancelarTexto}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 16,
  },
  emoji:    { fontSize: 48, textAlign: 'center' },
  titulo:   { fontSize: 22, fontWeight: 'bold', color: C.verde, textAlign: 'center' },
  subtitulo:{ color: C.textSec, fontSize: 15, textAlign: 'center' },

  codeCard: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  code:     { fontSize: 40, fontWeight: 'bold', color: C.verde, letterSpacing: 8, fontFamily: 'monospace' },
  timer:    { color: C.textMuted, fontSize: 13 },
  expirado: { color: C.vermelho, fontSize: 14, fontWeight: 'bold' },

  erroBox:    { backgroundColor: '#5c1a1a', borderRadius: 10, padding: 16, gap: 6, borderWidth: 1, borderColor: C.vermelho },
  erroTitulo: { color: C.vermelho, fontSize: 15, fontWeight: 'bold' },
  erroTexto:  { color: C.textSec, fontSize: 13, lineHeight: 18 },

  instrucoes:    { backgroundColor: C.input, borderRadius: 10, padding: 14, gap: 6 },
  instrucaoItem: { color: C.textSec, fontSize: 13, lineHeight: 20 },

  btn: {
    backgroundColor: C.azul,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnTexto: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  cancelarBtn:  { alignItems: 'center', marginTop: 4 },
  cancelarTexto:{ color: C.textMuted, fontSize: 13 },
});
