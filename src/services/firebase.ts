import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  QueryDocumentSnapshot,
  serverTimestamp,
  setDoc,
  startAfter,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

import { db, functions } from '@/lib/firebaseConfig';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface Config {
  horaInicio: number;
  minutoInicio: number;
  tempos: number[][];
}

export interface Status {
  irrigando: boolean;
  setorAtual: number; // 0–11; -1 = parado/nenhum setor ativo
  diaCiclo: number;
  restaSeg: number;
  tempoConfMin: number;
  online: boolean;
  ultimaVez: number | null;
  rtcOk?: boolean;
  sdOk?: boolean;
  fluxoSensorOk?: boolean;
  fluxoDetectado?: boolean;
}

export interface LogEntry {
  nome: string;
  data: string;
  horaInicio?: string;
  motivo?: string;
}

// ─── Paths ───────────────────────────────────────────────────────────────────
// Estrutura: /users/{uid}/controllers/{mac}/...
// {mac} é sempre 12 hex maiúsculo sem separador (ver src/lib/mac.ts).

const paths = (uid: string, mac: string) => ({
  config:   doc(db, `users/${uid}/controllers/${mac}/config/main`),
  status:   doc(db, `users/${uid}/controllers/${mac}/status/main`),
  comandos: collection(db, `users/${uid}/controllers/${mac}/comandos`),
  logs:     collection(db, `users/${uid}/controllers/${mac}/logs`),
});

// ─── Pareamento (Cloud Functions) ────────────────────────────────────────────
// O vínculo de um ESP32 à conta é feito por código de 6 caracteres — ver
// firebase_schema_esp32.txt. O app só chama as duas functions abaixo; quem
// troca o código pelo Custom Token é o próprio ESP32.

export async function gerarCodigoVinculacao(): Promise<{ code: string; expiraMinutos: number }> {
  const fn = httpsCallable<void, { code: string; expiraMinutos: number }>(
    functions,
    'gerarCodigoVinculacao',
  );
  const { data } = await fn();
  return data;
}

export async function desvincularDispositivo(mac: string): Promise<void> {
  const fn = httpsCallable<{ mac: string }, { ok: boolean }>(functions, 'desvincularDispositivo');
  await fn({ mac });
}

// ─── Lista de dispositivos ────────────────────────────────────────────────────

export function subscribeControllers(
  uid: string,
  onUpdate: (macs: string[]) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    collection(db, `users/${uid}/controllers`),
    (snap) => onUpdate(snap.docs.map((d) => d.id)),
    (err) => onError?.(err),
  );
}

// ─── Config ──────────────────────────────────────────────────────────────────

export async function getConfig(uid: string, mac: string): Promise<Config | null> {
  const snap = await getDoc(paths(uid, mac).config);
  if (!snap.exists()) return null;
  const d = snap.data();
  const temposMap = (d.tempos ?? {}) as Record<string, number[]>;
  const tempos = Array.from({ length: 7 }, (_, i) => temposMap[String(i)] ?? []);
  return { horaInicio: d.horaInicio, minutoInicio: d.minutoInicio, tempos };
}

export async function saveConfig(uid: string, mac: string, cfg: Config): Promise<void> {
  const tempos: Record<string, number[]> = {};
  cfg.tempos.forEach((row, i) => { tempos[String(i)] = row; });
  await setDoc(paths(uid, mac).config, { horaInicio: cfg.horaInicio, minutoInicio: cfg.minutoInicio, tempos });
}

// ─── Status (listener em tempo real) ─────────────────────────────────────────

export function subscribeStatus(
  uid: string,
  mac: string,
  onUpdate: (status: Status | null) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    paths(uid, mac).status,
    (snap) => {
      if (!snap.exists()) { onUpdate(null); return; }
      const d = snap.data();
      onUpdate({
        irrigando:    Boolean(d.irrigando),
        setorAtual:   Number(d.setorAtual ?? -1),
        diaCiclo:     Number(d.diaCiclo ?? 0),
        restaSeg:     Number(d.restaSeg ?? 0),
        tempoConfMin: Number(d.tempoConfMin ?? 0),
        online:       Boolean(d.online),
        ultimaVez:    d.ultimaVez?.toMillis() ?? null,
        rtcOk:        d.rtcOk === undefined ? undefined : Boolean(d.rtcOk),
        sdOk:         d.sdOk === undefined ? undefined : Boolean(d.sdOk),
        fluxoSensorOk:  d.fluxoSensorOk === undefined ? undefined : Boolean(d.fluxoSensorOk),
        fluxoDetectado: d.fluxoDetectado === undefined ? undefined : Boolean(d.fluxoDetectado),
      });
    },
    (err) => onError?.(err),
  );
}

// ─── Comandos ─────────────────────────────────────────────────────────────────

export async function sendCommand(
  uid: string,
  mac: string,
  acao: 'iniciar' | 'parar',
): Promise<void> {
  await addDoc(paths(uid, mac).comandos, {
    acao,
    ts: serverTimestamp(),
    processado: false,
    processadoEm: null,
  });
}

// ─── Logs (paginado) ──────────────────────────────────────────────────────────

const LOGS_PAGE_SIZE = 50;

export interface LogsPage {
  logs: LogEntry[];
  cursor: QueryDocumentSnapshot | null;
  hasMore: boolean;
}

export async function getLogs(
  uid: string,
  mac: string,
  cursor?: QueryDocumentSnapshot | null,
): Promise<LogsPage> {
  const ordenacao = [orderBy('data', 'desc'), orderBy('horaInicio', 'desc')] as const;
  const q = cursor
    ? query(paths(uid, mac).logs, ...ordenacao, startAfter(cursor), limit(LOGS_PAGE_SIZE))
    : query(paths(uid, mac).logs, ...ordenacao, limit(LOGS_PAGE_SIZE));

  const snap = await getDocs(q);
  return {
    logs: snap.docs.map((d) => d.data() as LogEntry),
    cursor: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null,
    hasMore: snap.docs.length === LOGS_PAGE_SIZE,
  };
}
