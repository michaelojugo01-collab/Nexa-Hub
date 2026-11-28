import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Button, Card, ListItem } from '@/components';
import { secureStorage, type LockMode } from '@/lib/auth/secure-storage';
import { useLockStore } from '@/stores/lock-store';
import { toast } from '@/stores/toast-store';

import { AuthScreen } from '../auth/AuthScreen';
import { InlineNotice } from '../auth/InlineNotice';
import { OtpInput } from '../auth/OtpInput';
import {
  authenticateWithBiometrics,
  getBiometricSupport,
  type BiometricSupport,
} from './biometrics';

type Step =
  | { kind: 'menu' }
  | { kind: 'pin-new' }
  | { kind: 'pin-confirm'; first: string }
  | { kind: 'verify-pin'; next: LockMode };

const modeLabel: Record<LockMode, string> = {
  off: 'Off',
  biometric: 'Face or fingerprint',
  pin: '4-digit PIN',
};

/** Turn the optional app lock on or off. Changing it requires passing the current lock. */
export function AppLockSettingsScreen() {
  const mode = useLockStore((s) => s.mode);
  const setMode = useLockStore((s) => s.setMode);
  const [support, setSupport] = useState<BiometricSupport | null>(null);
  const [step, setStep] = useState<Step>({ kind: 'menu' });
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getBiometricSupport().then(setSupport);
  }, []);

  /** Confirms the current lock before changing it. */
  const choose = async (next: LockMode) => {
    setError(null);
    if (next === mode) return;
    if (mode === 'biometric' && !(await authenticateWithBiometrics('Confirm to change app lock')))
      return;
    if (mode === 'pin') return setStep({ kind: 'verify-pin', next });
    await apply(next);
  };

  const apply = async (next: LockMode) => {
    if (next === 'pin') return setStep({ kind: 'pin-new' });
    if (next === 'biometric' && !(await authenticateWithBiometrics('Turn on app lock'))) return;
    await setMode(next);
    toast.show(next === 'off' ? 'App lock turned off' : 'App lock turned on', 'success');
    setStep({ kind: 'menu' });
  };

  const onPin = async (value: string) => {
    setPin(value);
    setError(null);
    if (value.length < 4) return;
    setPin('');
    if (step.kind === 'verify-pin') {
      if (await secureStorage.checkPin(value)) await apply(step.next);
      else setError('That PIN isn’t right.');
    } else if (step.kind === 'pin-new') {
      setStep({ kind: 'pin-confirm', first: value });
    } else if (step.kind === 'pin-confirm') {
      if (value !== step.first) {
        setError('The PINs didn’t match. Start again.');
        setStep({ kind: 'pin-new' });
        return;
      }
      await setMode('pin', value);
      toast.show('PIN lock turned on', 'success');
      setStep({ kind: 'menu' });
    }
  };

  if (step.kind !== 'menu') {
    const title =
      step.kind === 'verify-pin'
        ? 'Enter your current PIN'
        : step.kind === 'pin-new'
          ? 'Choose a 4-digit PIN'
          : 'Enter it again';
    return (
      <AuthScreen
        testID="app-lock-pin"
        footer={
          <Button label="Cancel" variant="ghost" onPress={() => setStep({ kind: 'menu' })} />
        }>
        <Stack.Screen options={{ title: 'App lock' }} />
        <View className="gap-4 pt-8">
          <Text accessibilityRole="header" className="text-xl font-semibold text-text">
            {title}
          </Text>
          <OtpInput
            key={step.kind}
            value={pin}
            length={4}
            secure
            error={!!error}
            onChange={onPin}
            testID="app-lock-pin-input"
          />
          {error ? <InlineNotice tone="error" message={error} /> : null}
        </View>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen testID="app-lock-screen">
      <Stack.Screen options={{ title: 'App lock' }} />
      <View className="gap-4 pt-4">
        <Text className="text-sm text-text-muted">
          Ask for your face, fingerprint or PIN when you come back to Nexa Hub after 5 minutes away.
          Currently: <Text className="font-semibold text-text">{modeLabel[mode]}</Text>
        </Text>
        <Card flush className="px-4">
          <ListItem
            title="Off"
            icon="lock-open-outline"
            onPress={() => choose('off')}
            right={mode === 'off' ? <Text className="text-text">✓</Text> : undefined}
            testID="app-lock-off"
          />
          <ListItem
            title="Face or fingerprint"
            icon="finger-print-outline"
            subtitle={
              !support
                ? 'Checking this device…'
                : support.available
                  ? support.label
                  : support.reason === 'no-hardware'
                    ? 'This device has no face or fingerprint sensor'
                    : 'Set up face or fingerprint in your phone’s settings first'
            }
            disabled={!support?.available}
            onPress={() => choose('biometric')}
            right={mode === 'biometric' ? <Text className="text-text">✓</Text> : undefined}
            testID="app-lock-biometric"
          />
          <ListItem
            title="4-digit PIN"
            icon="keypad-outline"
            onPress={() => choose('pin')}
            right={mode === 'pin' ? <Text className="text-text">✓</Text> : undefined}
            testID="app-lock-pin-option"
            last
          />
        </Card>
        {error ? <InlineNotice tone="error" message={error} /> : null}
        <Text className="text-xs text-text-subtle">
          5 wrong PINs sign you out; you’ll sign back in with a code. Forgot your PIN? Log out from
          the lock screen.
        </Text>
      </View>
    </AuthScreen>
  );
}
