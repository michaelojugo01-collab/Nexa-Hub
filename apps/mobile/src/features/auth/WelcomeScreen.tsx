import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Button } from '@/components';
import { ChromeGradient } from '@/components/internal/ChromeGradient';
import { useAuthStore, type SignOutReason } from '@/stores/auth-store';
import { useSignInStore } from '@/stores/sign-in-store';

import { AuthScreen } from './AuthScreen';
import { InlineNotice } from './InlineNotice';

const signOutMessages: Partial<Record<SignOutReason, string>> = {
  expired: 'Your session ended. Please sign in again.',
  deleted:
    'Your account is deactivated and will be deleted in 30 days. Sign in before then to keep it.',
  locked: 'Too many wrong PIN attempts. Please sign in again.',
};

export function WelcomeScreen() {
  const reason = useAuthStore((s) => s.lastSignOutReason);
  const setIntent = useSignInStore((s) => s.setIntent);
  const reset = useSignInStore((s) => s.reset);
  const notice = reason ? signOutMessages[reason] : undefined;

  const start = (intent: 'signup' | 'signin') => {
    reset();
    setIntent(intent);
    router.push('/phone');
  };

  return (
    <AuthScreen
      testID="welcome-screen"
      footer={
        <>
          <Button
            label="Get started"
            onPress={() => start('signup')}
            testID="welcome-get-started"
          />
          <Button
            label="I already have an account"
            variant="secondary"
            onPress={() => start('signin')}
            testID="welcome-sign-in"
          />
          {__DEV__ ? (
            <Button
              label="Dev settings"
              variant="ghost"
              size="sm"
              onPress={() => router.push('/dev/settings')}
              testID="welcome-dev-settings"
            />
          ) : null}
        </>
      }>
      <View className="flex-1 justify-center gap-6 pt-16">
        <View className="gap-3">
          <ChromeGradient className="h-1.5 w-16 rounded-full" />
          <Text accessibilityRole="header" className="text-3xl font-bold text-text">
            NEXA HUB
          </Text>
          <Text className="text-2xl font-semibold text-text">Sell Anything. Earn Your Freedom</Text>
          <Text className="text-base text-text-muted">
            Buy from and sell to Nigerian creators, students and small businesses.
          </Text>
        </View>
        {notice ? <InlineNotice tone="info" message={notice} testID="welcome-notice" /> : null}
      </View>
    </AuthScreen>
  );
}
