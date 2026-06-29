import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { C } from '@/constants/irrigation';
import { AppProvider, useApp } from '@/contexts/AppContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import AuthScreen from '@/screens/AuthScreen';
import SetupScreen from '@/screens/SetupScreen';

function Root() {
  const { user, authLoading } = useAuth();
  const { mac, macLoading }   = useApp();
  const colorScheme = useColorScheme();

  if (authLoading || macLoading) {
    return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  }

  if (!user) return <AuthScreen />;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {mac ? <AppTabs /> : <SetupScreen />}
    </ThemeProvider>
  );
}

export default function TabLayout() {
  return (
    <AuthProvider>
      <AppProvider>
        <AnimatedSplashOverlay />
        <Root />
      </AppProvider>
    </AuthProvider>
  );
}
