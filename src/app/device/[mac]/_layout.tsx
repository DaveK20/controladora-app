import { useLocalSearchParams } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useEffect } from 'react';

import { useApp } from '@/contexts/AppContext';

export default function DeviceTabs() {
  const { mac } = useLocalSearchParams<{ mac: string }>();
  const { setLastOpenedMac } = useApp();

  useEffect(() => { if (mac) setLastOpenedMac(mac); }, [mac, setLastOpenedMac]);

  return (
    <NativeTabs backgroundColor="#1a252f" indicatorColor="#2c3e50" labelStyle={{ selected: { color: '#2ecc71' } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Status</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="config">
        <NativeTabs.Trigger.Label>Configuração</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="logs">
        <NativeTabs.Trigger.Label>Histórico</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
