import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { C } from '@/constants/irrigation';
import { AppProvider, useApp } from '@/contexts/AppContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import AuthScreen from '@/screens/AuthScreen';

function Root() {
  const { user, authLoading } = useAuth();
  const { macsLoading } = useApp();
  const colorScheme = useColorScheme();

  if (authLoading || (user && macsLoading)) {
    return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  }

  if (!user) return <AuthScreen />;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppProvider>
        <AnimatedSplashOverlay />
        <Root />
      </AppProvider>
    </AuthProvider>
  );
}
