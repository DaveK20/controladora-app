import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { C } from '@/constants/irrigation';
import { useAuth } from '@/contexts/AuthContext';
import { avaliarForcaSenha } from '@/lib/passwordStrength';

type Mode = 'login' | 'cadastro';

const FIREBASE_ERRORS: Record<string, string> = {
  'auth/user-not-found':        'E-mail não cadastrado.',
  'auth/wrong-password':        'Senha incorreta.',
  'auth/invalid-credential':    'E-mail ou senha incorretos.',
  'auth/email-already-in-use':  'Este e-mail já está cadastrado.',
  'auth/weak-password':         'A senha deve ter pelo menos 6 caracteres.',
  'auth/invalid-email':         'E-mail inválido.',
  'auth/too-many-requests':     'Muitas tentativas. Aguarde alguns minutos.',
  'auth/operation-not-allowed': 'Login por e-mail não está ativado. Contate o suporte.',
  'auth/network-request-failed':'Sem conexão com a internet.',
  'auth/user-disabled':         'Esta conta foi desativada.',
};

function mensagemErro(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code: string }).code;
    console.warn('Firebase Auth error:', code, err);
    return FIREBASE_ERRORS[code] ?? `Ocorreu um erro. Tente novamente. (${code})`;
  }
  return 'Ocorreu um erro. Tente novamente.';
}

export default function AuthScreen() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode]           = useState<Mode>('login');
  const [email, setEmail]         = useState('');
  const [senha, setSenha]         = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [erro, setErro]           = useState('');
  const [info, setInfo]           = useState('');
  const [enviandoReset, setEnviandoReset] = useState(false);

  const forca = avaliarForcaSenha(senha);
  const corForca = forca.score <= 2 ? C.vermelho : forca.score <= 4 ? C.laranja : C.verde;
  const labelForca = forca.score <= 2 ? 'Fraca' : forca.score <= 4 ? 'Média' : 'Forte';

  const trocarModo = (novo: Mode) => {
    setMode(novo);
    setErro('');
    setInfo('');
    setSenha('');
    setConfirmar('');
  };

  const handleEsqueciSenha = async () => {
    setErro('');
    setInfo('');
    if (!email.trim()) { setErro('Informe o e-mail pra receber o link de redefinição.'); return; }

    setEnviandoReset(true);
    try {
      await resetPassword(email.trim());
      setInfo('E-mail de redefinição enviado! Confira sua caixa de entrada.');
    } catch (err) {
      setErro(mensagemErro(err));
    } finally {
      setEnviandoReset(false);
    }
  };

  const handleSubmit = async () => {
    setErro('');
    setInfo('');

    if (!email.trim())  { setErro('Informe o e-mail.'); return; }
    if (!senha)         { setErro('Informe a senha.'); return; }

    if (mode === 'cadastro') {
      if (avaliarForcaSenha(senha).score < 5) {
        setErro('A senha não atende aos requisitos de segurança abaixo.');
        return;
      }
      if (senha !== confirmar)  { setErro('As senhas não coincidem.'); return; }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), senha);
      } else {
        await signUp(email.trim(), senha);
      }
    } catch (err) {
      setErro(mensagemErro(err));
    } finally {
      setLoading(false);
    }
  };

  const btnLabel = loading
    ? (mode === 'login' ? 'Entrando...' : 'Criando conta...')
    : (mode === 'login' ? 'Entrar' : 'Criar conta');

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">

        <Text style={s.emoji}>💧</Text>
        <Text style={s.titulo}>Controladora de Irrigação</Text>
        <Text style={s.subtitulo}>Gerencie sua irrigação de qualquer lugar</Text>

        {/* Abas Login / Criar conta */}
        <View style={s.abas}>
          <TouchableOpacity
            style={[s.aba, mode === 'login' && s.abaAtiva]}
            onPress={() => trocarModo('login')}>
            <Text style={[s.abaTexto, mode === 'login' && s.abaTextoAtivo]}>Entrar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.aba, mode === 'cadastro' && s.abaAtiva]}
            onPress={() => trocarModo('cadastro')}>
            <Text style={[s.abaTexto, mode === 'cadastro' && s.abaTextoAtivo]}>Criar conta</Text>
          </TouchableOpacity>
        </View>

        <View style={s.card}>
          {/* E-mail */}
          <Text style={s.label}>E-mail</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="seu@email.com"
            placeholderTextColor={C.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Senha */}
          <Text style={[s.label, { marginTop: 14 }]}>Senha</Text>
          <View style={s.senhaRow}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              value={senha}
              onChangeText={setSenha}
              placeholder="••••••"
              placeholderTextColor={C.textMuted}
              secureTextEntry={!mostrarSenha}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={s.olho} onPress={() => setMostrarSenha(v => !v)}>
              <Text style={s.olhoTexto}>{mostrarSenha ? 'ocultar' : 'mostrar'}</Text>
            </TouchableOpacity>
          </View>

          {/* Barra de força — só no cadastro */}
          {mode === 'cadastro' && (
            <View style={s.forcaContainer}>
              <View style={s.forcaBarRow}>
                <View style={s.forcaBarBg}>
                  <View style={[s.forcaBarFill, { width: `${(forca.score / 5) * 100}%`, backgroundColor: corForca }]} />
                </View>
                {!!senha && <Text style={[s.forcaLabel, { color: corForca }]}>{labelForca}</Text>}
              </View>
              <View style={s.forcaChecklist}>
                <Text style={[s.forcaItem, forca.comprimento && { color: C.verde }]}>{forca.comprimento ? '✓' : '○'} 8+ caracteres</Text>
                <Text style={[s.forcaItem, forca.maiuscula && { color: C.verde }]}>{forca.maiuscula ? '✓' : '○'} Maiúscula</Text>
                <Text style={[s.forcaItem, forca.minuscula && { color: C.verde }]}>{forca.minuscula ? '✓' : '○'} Minúscula</Text>
                <Text style={[s.forcaItem, forca.numero && { color: C.verde }]}>{forca.numero ? '✓' : '○'} Número</Text>
                <Text style={[s.forcaItem, forca.especial && { color: C.verde }]}>{forca.especial ? '✓' : '○'} Caractere especial</Text>
              </View>
            </View>
          )}

          {/* Confirmar senha — só no cadastro */}
          {mode === 'cadastro' && (
            <>
              <Text style={[s.label, { marginTop: 14 }]}>Confirmar senha</Text>
              <TextInput
                style={s.input}
                value={confirmar}
                onChangeText={setConfirmar}
                placeholder="••••••"
                placeholderTextColor={C.textMuted}
                secureTextEntry={!mostrarSenha}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </>
          )}

          {mode === 'login' && (
            <TouchableOpacity
              style={s.esqueciBtn}
              onPress={handleEsqueciSenha}
              disabled={enviandoReset}>
              <Text style={s.esqueciTexto}>
                {enviandoReset ? 'Enviando...' : 'Esqueci minha senha'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Mensagens inline */}
          {!!info && <Text style={s.info}>{info}</Text>}
          {!!erro && <Text style={s.erro}>{erro}</Text>}
        </View>

        <TouchableOpacity
          style={[s.btn, loading && { opacity: 0.55 }]}
          onPress={handleSubmit}
          disabled={loading}>
          <Text style={s.btnTexto}>{btnLabel}</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
    gap: 16,
  },
  emoji:    { fontSize: 52, textAlign: 'center' },
  titulo:   { fontSize: 22, fontWeight: 'bold', color: C.verde, textAlign: 'center' },
  subtitulo:{ fontSize: 13, color: C.textMuted, textAlign: 'center' },
  abas: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 10,
    padding: 4,
  },
  aba: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  abaAtiva:      { backgroundColor: C.verde },
  abaTexto:      { color: C.textSec, fontWeight: 'bold', fontSize: 14 },
  abaTextoAtivo: { color: '#fff' },
  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
  },
  label: { color: C.textSec, fontSize: 13, marginBottom: 6 },
  input: {
    backgroundColor: C.input,
    color: C.text,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555',
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
  },
  senhaRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  olho:      { paddingHorizontal: 2 },
  olhoTexto: { color: C.azul, fontSize: 13 },
  forcaContainer: { marginTop: 10, gap: 6 },
  forcaBarRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  forcaBarBg:     { flex: 1, height: 6, borderRadius: 3, backgroundColor: C.input, overflow: 'hidden' },
  forcaBarFill:   { height: '100%', borderRadius: 3 },
  forcaLabel:     { fontSize: 12, fontWeight: 'bold' },
  forcaChecklist: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  forcaItem:      { color: C.textMuted, fontSize: 11 },
  esqueciBtn:   { alignItems: 'flex-end', marginTop: 10 },
  esqueciTexto: { color: C.azul, fontSize: 13 },
  info:      { color: C.verde, fontSize: 13, marginTop: 12 },
  erro:      { color: C.vermelho, fontSize: 13, marginTop: 12 },
  btn: {
    backgroundColor: C.verde,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
