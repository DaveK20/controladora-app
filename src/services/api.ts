export interface Status {
  irrigando: boolean;
  setorAtual: number;
  diaCiclo: number;
  restaSeg: number;
  tempoConfMin: number;
  rtc: string;
  pinosOk: boolean;
  sdOk: boolean;
  fluxoAtivo: boolean;
  fluxoPresente: boolean;
}

export interface IrrigacaoConfig {
  totalSetores: number;
  maxSetores: number;
  horaInicio: number;
  minutoInicio: number;
  fluxoAtivo: boolean;
  fluxoGpio: number;
  tempos: number[][];
}

export interface PinoConfig {
  gpio: number;
  tipo: 0 | 1 | 2 | 3;
  setorAssoc: number;
  label: string;
}

async function req<T>(url: string, options?: RequestInit): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(t);
  }
}

export const api = {
  getStatus: (base: string) => req<Status>(`${base}/api/status`),

  getConfig: (base: string) => req<IrrigacaoConfig>(`${base}/api/config`),

  postConfig: async (base: string, cfg: Omit<IrrigacaoConfig, 'maxSetores'>): Promise<boolean> => {
    const j = await req<{ ok: boolean }>(`${base}/api/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg),
    });
    return j.ok;
  },

  postRtc: async (
    base: string,
    d: { hora: number; minuto: number; dia: number; mes: number; ano: number },
  ): Promise<boolean> => {
    const j = await req<{ ok: boolean }>(`${base}/api/rtc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(d),
    });
    return j.ok;
  },

  getPinos: (base: string) =>
    req<{ pinos: PinoConfig[]; configurados: boolean }>(`${base}/api/pinos`),

  postPinos: (base: string, pinos: PinoConfig[]) =>
    req<{ ok: boolean; configurados: boolean }>(`${base}/api/pinos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinos }),
    }),

  iniciar: async (base: string): Promise<boolean> => {
    const j = await req<{ ok: boolean }>(`${base}/api/iniciar`, { method: 'POST' });
    return j.ok;
  },

  parar: async (base: string): Promise<boolean> => {
    const j = await req<{ ok: boolean }>(`${base}/api/parar`, { method: 'POST' });
    return j.ok;
  },

  getLogs: async (base: string): Promise<string[]> => {
    const j = await req<{ arquivos: string[] }>(`${base}/api/logs`);
    return j.arquivos ?? [];
  },
};
