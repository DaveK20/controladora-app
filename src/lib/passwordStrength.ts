export interface ForcaSenha {
  comprimento: boolean; // >= 8 caracteres
  maiuscula: boolean;
  minuscula: boolean;
  numero: boolean;
  especial: boolean; // qualquer caractere fora de [A-Za-z0-9]
  score: number; // 0-5, quantos critérios passaram
}

export function avaliarForcaSenha(senha: string): ForcaSenha {
  const comprimento = senha.length >= 8;
  const maiuscula   = /[A-Z]/.test(senha);
  const minuscula   = /[a-z]/.test(senha);
  const numero      = /[0-9]/.test(senha);
  const especial    = /[^A-Za-z0-9]/.test(senha);
  const score = [comprimento, maiuscula, minuscula, numero, especial].filter(Boolean).length;
  return { comprimento, maiuscula, minuscula, numero, especial, score };
}
