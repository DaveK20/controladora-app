import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { db } from '@/lib/firebaseConfig';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface Config {
  horaInicio: number;
  minutoInicio: number;
  tempos: number[][];
}

export interface Status {
  irrigando: boolean;
  setorAtual: number;
  diaCiclo: number;
  restaSeg: number;
  tempoConfMin: number;
  online: boolean;
  ultimaVez: number | null;
}

export interface LogEntry {
  nome: string;
  data: string;
  horaInicio?: string;
  motivo?: string;
}

// ─── Paths ───────────────────────────────────────────────────────────────────
// Estrutura: /users/{uid}/controllers/{mac}/...
// Garante que cada usuário acessa apenas seus próprios dispositivos.

const paths = (uid: string, mac: string) => ({
  config:   doc(db, `users/${uid}/controllers/${mac}/config/main`),
  status:   doc(db, `users/${uid}/controllers/${mac}/status/main`),
  comandos: collection(db, `users/${uid}/controllers/${mac}/comandos`),
  logs:     collection(db, `users/${uid}/controllers/${mac}/logs`),
});

// Registro global de propriedade do dispositivo
const ownershipDoc = (mac: string) => doc(db, `controllers/${mac}`);

// ─── Vinculação de dispositivo ────────────────────────────────────────────────

export type ClaimResult = 'claimed' | 'already_mine' | 'taken';

export async function claimDevice(uid: string, mac: string): Promise<ClaimResult> {
  const ref  = ownershipDoc(mac);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, { ownerUid: uid, claimedAt: serverTimestamp() });
    return 'claimed';
  }

  return snap.data().ownerUid === uid ? 'already_mine' : 'taken';
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
        setorAtual:   Number(d.setorAtual ?? 0),
        diaCiclo:     Number(d.diaCiclo ?? 0),
        restaSeg:     Number(d.restaSeg ?? 0),
        tempoConfMin: Number(d.tempoConfMin ?? 0),
        online:       Boolean(d.online),
        ultimaVez:    d.ultimaVez?.toMillis() ?? null,
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

// ─── Logs ─────────────────────────────────────────────────────────────────────

export async function getLogs(uid: string, mac: string): Promise<LogEntry[]> {
  const q    = query(paths(uid, mac).logs, orderBy('data', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as LogEntry);
}
