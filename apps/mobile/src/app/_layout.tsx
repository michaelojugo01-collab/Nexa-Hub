import '../global.css';
import '../theme/interop';

import { QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastHost } from '@/components';
import { queryClient, wireQueryManagers } from '@/lib/api/query-client';
import { restoreSession } from '@/lib/auth/session';
import { useAuthStore } from '@/stores/auth-store';
import { LockScreen } from '@/features/lock/LockScreen';
import { UploadResumer } from '@/features/products/upload/UploadResumer';
import { useAppLock } from '@/features/lock/use-app-lock';
import { useLockStore } from '@/stores/lock-store';
import { ThemeProvider } from '@/theme/ThemeProvider';

wireQueryManagers();
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const status = useAuthStore((s) => s.status);
  const onboarding = useAuthStore((s) => s.onboarding);
  const locked = useLockStore((s) => s.locked);
  useAppLock();

  useEffect(() => {
    void restoreSession();
  }, []);

  useEffect(() => {
    if (status !== 'restoring') void SplashScreen.hideAsync().catch(() => undefined);
  }, [status]);

  if (status === 'restoring') return null; // native splash stays up

  const signedIn = status === 'signedIn';

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={signedIn && !onboarding}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="account" />
              <Stack.Screen name="seller" />
              <Stack.Screen
                name="checkout/[productId]"
                options={{ headerShown: true, title: 'Checkout' }}
              />
            </Stack.Protected>
            {/* Public pages from links: open signed out too, but not in the middle of onboarding. */}
            <Stack.Protected guard={!(signedIn && onboarding)}>
              <Stack.Screen name="store/[slug]" />
              <Stack.Screen name="[slug]" />
              <Stack.Screen name="product/[store]/[product]" />
              <Stack.Screen name="user/[username]" />
            </Stack.Protected>
            <Stack.Protected guard={signedIn && onboarding}>
              <Stack.Screen name="(onboarding)" />
            </Stack.Protected>
            <Stack.Protected guard={!signedIn}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
            <Stack.Protected guard={__DEV__}>
              <Stack.Screen
                name="dev/components"
                options={{ headerShown: true, title: 'Components' }}
              />
              <Stack.Screen
                name="dev/settings"
                options={{ headerShown: true, title: 'Dev settings' }}
              />
            </Stack.Protected>
          </Stack>
          {signedIn && !onboarding ? <UploadResumer /> : null}
          {signedIn && locked ? <LockScreen /> : null}
          <ToastHost />
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
