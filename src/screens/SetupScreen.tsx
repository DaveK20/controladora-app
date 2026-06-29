import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { C } from '@/constants/irrigation';
import { isValidMac, useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';

export default function SetupScreen() {
  const { connectMac } = useApp();
  const { signOut } = useAuth();
  const [input, setInput]   = useState('');
  const [saving, setSaving] = useState(false);
  const [erro, setErro]     = useState('');

  const handleConfirm = async () => {
    if (!isValidMac(input)) {
      setErro('Use o formato AA:BB:CC:DD:EE:FF (encontrado na etiqueta do ESP32).');
      return;
    }
    setSaving(true);
    setErro('');
    try {
      const result = await connectMac(input);
      if (result === 'taken') {
        setErro('Este dispositivo já está registrado em outra conta. Verifique o MAC ou entre em contato com o suporte.');
      }
    } catch {
      setErro('Não foi possível verificar o dispositivo. Verifique sua conexão.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangeText = (text: string) => {
    setErro('');
    const clean = text.replace(/[^0-9A-Fa-f]/g, '').slice(0, 12);
    const parts: string[] = [];
    for (let i = 0; i < clean.length; i += 2) {
      parts.push(clean.slice(i, i + 2));
    }
    setInput(parts.join(':'));
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.inner}>
        <Text style={s.emoji}>💧</Text>
        <Text style={s.titulo}>Controladora de Irrigação</Text>
        <Text style={s.subtitulo}>
          Para começar, informe o endereço MAC{'\n'}do seu ESP32.
        </Text>

        <View style={s.card}>
          <Text style={s.label}>Endereço MAC do ESP32</Text>
          <TextInput
            style={s.input}
            value={input}
            onChangeText={handleChangeText}
            placeholder="AA:BB:CC:DD:EE:FF"
            placeholderTextColor={C.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            keyboardType="default"
            maxLength={17}
          />
          <Text style={s.hint}>
            Encontre o MAC no Serial Monitor do Arduino IDE ao iniciar o ESP32,{'\n'}
            ou na etiqueta colada na placa.
          </Text>
          {!!erro && <Text style={s.erro}>{erro}</Text>}
        </View>

        <TouchableOpacity
          style={[s.btn, (!isValidMac(input) || saving) && { opacity: 0.45 }]}
          onPress={handleConfirm}
          disabled={saving || !isValidMac(input)}>
          <Text style={s.btnTexto}>{saving ? 'Verificando...' : 'Conectar controladora'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.sairBtn} onPress={signOut}>
          <Text style={s.sairTexto}>Sair da conta</Text>
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
  subtitulo:{ color: C.textSec, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    gap: 8,
  },
  label: { color: C.textSec, fontSize: 13 },
  input: {
    backgroundColor: C.input,
    color: C.text,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#555',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
    letterSpacing: 1,
  },
  hint: { color: C.textMuted, fontSize: 12, lineHeight: 18 },
  erro: { color: C.vermelho, fontSize: 13, lineHeight: 18 },
  btn: {
    backgroundColor: C.verde,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  sairBtn:  { alignItems: 'center', marginTop: 8 },
  sairTexto:{ color: C.textMuted, fontSize: 13 },
});
