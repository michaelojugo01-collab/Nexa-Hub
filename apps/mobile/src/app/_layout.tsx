import '../global.css';
import '../theme/interop';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastHost } from '@/components';
import { ThemeProvider } from '@/theme/ThemeProvider';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="dev/components"
            options={{ headerShown: true, title: 'Components' }}
          />
        </Stack>
        <ToastHost />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
