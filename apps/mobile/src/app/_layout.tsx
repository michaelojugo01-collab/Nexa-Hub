import '../global.css';
import '../theme/interop';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastHost } from '@/components';
import { createQueryClient, wireQueryManagers } from '@/lib/api/query-client';
import { ThemeProvider } from '@/theme/ThemeProvider';

wireQueryManagers();

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  );
}
