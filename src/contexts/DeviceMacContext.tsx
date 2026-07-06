import React, { createContext, useContext } from 'react';

// useLocalSearchParams() não é confiável dentro das telas filhas do NativeTabs
// (expo-router/unstable-native-tabs) — o parâmetro [mac] chega undefined ali,
// mesmo com a rota certa selecionada. _layout.tsx lê o mac uma vez (onde
// useLocalSearchParams funciona) e repassa por Context pras telas de dentro
// da aba, que não devem chamar useLocalSearchParams por conta própria.
const Ctx = createContext<string | undefined>(undefined);

export function DeviceMacProvider({ mac, children }: { mac: string | undefined; children: React.ReactNode }) {
  return <Ctx.Provider value={mac}>{children}</Ctx.Provider>;
}

export const useDeviceMac = () => useContext(Ctx);
