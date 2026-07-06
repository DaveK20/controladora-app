import { useLocalSearchParams } from 'expo-router';
import { TabList, TabSlot, Tabs, TabTrigger, TabTriggerSlotProps } from 'expo-router/ui';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { C } from '@/constants/irrigation';
import { useApp } from '@/contexts/AppContext';
import { DeviceMacProvider } from '@/contexts/DeviceMacContext';

function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={[s.tabButton, isFocused && s.tabButtonActive]}>
      <Text style={[s.tabButtonText, isFocused && s.tabButtonTextActive]}>{children}</Text>
    </Pressable>
  );
}

export default function DeviceTabsWeb() {
  const { mac } = useLocalSearchParams<{ mac: string }>();
  const { setLastOpenedMac } = useApp();

  useEffect(() => { if (mac) setLastOpenedMac(mac); }, [mac, setLastOpenedMac]);

  return (
    <DeviceMacProvider mac={mac}>
      <Tabs>
        <TabSlot style={{ flex: 1 }} />
        <TabList style={s.tabList}>
          <TabTrigger name="status" href={{ pathname: '/device/[mac]', params: { mac } }} asChild>
            <TabButton>Status</TabButton>
          </TabTrigger>
          <TabTrigger name="config" href={{ pathname: '/device/[mac]/config', params: { mac } }} asChild>
            <TabButton>Configuração</TabButton>
          </TabTrigger>
          <TabTrigger name="logs" href={{ pathname: '/device/[mac]/logs', params: { mac } }} asChild>
            <TabButton>Histórico</TabButton>
          </TabTrigger>
        </TabList>
      </Tabs>
    </DeviceMacProvider>
  );
}

const s = StyleSheet.create({
  tabList: { flexDirection: 'row', backgroundColor: C.card, padding: 6, gap: 4 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabButtonActive: { backgroundColor: C.azul },
  tabButtonText: { color: C.textSec, fontWeight: '600' },
  tabButtonTextActive: { color: '#fff' },
});
