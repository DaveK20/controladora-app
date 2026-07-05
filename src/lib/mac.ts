// MAC interno: sempre 12 hex maiúsculos, sem separador (ex: "8813BF002C9C").
// É o formato usado nos paths do Firestore e nas Cloud Functions.

export function isValidMac(mac: string): boolean {
  return /^[0-9A-Fa-f]{12}$/.test(mac.trim());
}

export function normalizeMac(mac: string): string {
  return mac.trim().toUpperCase().replace(/[^0-9A-F]/g, '');
}

// Só para exibição: "8813BF002C9C" → "88:13:BF:00:2C:9C"
export function formatMacDisplay(mac: string): string {
  return mac.replace(/(.{2})(?=.)/g, '$1:');
}
