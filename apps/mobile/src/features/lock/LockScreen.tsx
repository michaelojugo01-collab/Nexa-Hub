import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components';
import { ChromeGradient } from '@/components/internal/ChromeGradient';
import { secureStorage } from '@/lib/auth/secure-storage';
import { signOutLocally } from '@/lib/auth/sign-out';
import { MAX_PIN_ATTEMPTS, useLockStore } from '@/stores/lock-store';

import { InlineNotice } from '../auth/InlineNotice';
import { OtpInput } from '../auth/OtpInput';
import { authenticateWithBiometrics } from './biometrics';

/** Covers the whole app until the user unlocks. 5 wrong PINs sign the user out. */
export function LockScreen() {
  const mode = useLockStore((s) => s.mode);
  const failures = useLockStore((s) => s.failures);
  const unlock = useLockStore((s) => s.unlock);
  const recordFailure = useLockStore((s) => s.recordFailure);
  const [pin, setPin] = useState('');
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const tryBiometrics = async () => {
    if (await authenticateWithBiometrics()) await unlock();
  };

  useEffect(() => {
    if (mode === 'biometric') void tryBiometrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const submitPin = async (value: string) => {
    setChecking(true);
    const ok = await secureStorage.checkPin(value);
    setChecking(false);
    setPin('');
    if (ok) {
      await unlock();
      return;
    }
    const left = await recordFailure();
    if (left === 0) {
      useLockStore.getState().reset();
      await signOutLocally('locked');
      return;
    }
    setMessage(
      `Wrong PIN. ${left} ${left === 1 ? 'attempt' : 'attempts'} left before you’re signed out.`,
    );
  };

  const signOut = async () => {
    useLockStore.getState().reset();
    await signOutLocally('logout');
  };

  return (
    <SafeAreaView className="absolute inset-0 bg-bg" testID="lock-screen" accessibilityViewIsModal>
      <View className="flex-1 justify-center gap-6 px-6">
        <View className="items-center gap-3">
          <ChromeGradient className="h-1.5 w-16 rounded-full" />
          <Text accessibilityRole="header" className="text-2xl font-bold text-text">
            Nexa Hub is locked
          </Text>
          <Text className="text-center text-sm text-text-muted">
            {mode === 'pin' ? 'Enter your 4-digit PIN.' : 'Unlock with your face or fingerprint.'}
          </Text>
        </View>

        {mode === 'pin' ? (
          <View className="gap-4">
            <OtpInput
              value={pin}
              length={4}
              secure
              disabled={checking}
              error={!!message}
              onChange={(value) => {
                setPin(value);
                setMessage(null);
                if (value.length === 4) void submitPin(value);
              }}
              testID="lock-pin"
            />
            {message ? <InlineNotice tone="error" message={message} testID="lock-message" /> : null}
            {failures > 0 && !message ? (
              <Text className="text-center text-xs text-text-subtle">
                {MAX_PIN_ATTEMPTS - failures} attempts left
              </Text>
            ) : null}
          </View>
        ) : (
          <Button label="Unlock" onPress={tryBiometrics} testID="lock-biometric" />
        )}

        <Button label="Forgot? Log out" variant="ghost" onPress={signOut} testID="lock-logout" />
      </View>
    </SafeAreaView>
  );
}
