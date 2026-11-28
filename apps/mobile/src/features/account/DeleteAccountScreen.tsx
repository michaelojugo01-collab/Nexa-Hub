import { useMutation } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button, Input } from '@/components';
import { api } from '@/lib/api/client';
import { errorMessage, isOfflineError } from '@/lib/api/error-message';
import { signOutLocally } from '@/lib/auth/sign-out';
import { useLockStore } from '@/stores/lock-store';

import { AuthScreen } from '../auth/AuthScreen';
import { InlineNotice } from '../auth/InlineNotice';

const deleted = [
  'Your profile, username, photo and interests',
  'Your store and listings, and access to your library',
  'Your sign-in on every device (you’re signed out now)',
];
const kept = [
  'Order, payment and payout records the law requires us to keep',
  'Reviews and messages others received may stay, without your name',
];

/** Two steps: explain, then type DELETE. Deactivates now; permanent after 30 days. */
export function DeleteAccountScreen() {
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmation, setConfirmation] = useState('');

  const remove = useMutation({
    mutationFn: () => api.deleteMe(),
    onSuccess: async () => {
      useLockStore.getState().reset();
      await signOutLocally('deleted');
    },
  });

  if (step === 1) {
    return (
      <AuthScreen
        testID="delete-step-1"
        footer={
          <>
            <Button
              label="Continue"
              variant="secondary"
              onPress={() => setStep(2)}
              testID="delete-continue"
            />
          </>
        }>
        <Stack.Screen options={{ title: 'Delete account' }} />
        <View className="gap-4 pt-4">
          <Text accessibilityRole="header" className="text-xl font-semibold text-text">
            Before you go
          </Text>
          <Text className="text-sm text-text-muted">
            Your account is deactivated straight away and permanently deleted after 30 days. Sign in
            again before then to cancel.
          </Text>
          <View className="gap-2">
            <Text className="text-sm font-semibold text-text">What we delete</Text>
            {deleted.map((d) => (
              <Text key={d} className="text-sm text-text">
                • {d}
              </Text>
            ))}
          </View>
          <View className="gap-2">
            <Text className="text-sm font-semibold text-text">What we keep</Text>
            {kept.map((d) => (
              <Text key={d} className="text-sm text-text">
                • {d}
              </Text>
            ))}
          </View>
          <Text className="text-xs text-text-subtle">
            Tip: export your data first from Profile → Export my data.
          </Text>
        </View>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      testID="delete-step-2"
      footer={
        <>
          <Button
            label="Delete my account"
            onPress={() => remove.mutate()}
            loading={remove.isPending}
            disabled={confirmation.trim() !== 'DELETE'}
            testID="delete-confirm"
            accessibilityHint="Deactivates your account and signs you out"
          />
          <Button label="Back" variant="ghost" onPress={() => setStep(1)} />
        </>
      }>
      <Stack.Screen options={{ title: 'Delete account' }} />
      <View className="gap-4 pt-4">
        <Text accessibilityRole="header" className="text-xl font-semibold text-text">
          Type DELETE to confirm
        </Text>
        <Input
          label="Confirmation"
          placeholder="DELETE"
          autoCapitalize="characters"
          autoCorrect={false}
          value={confirmation}
          onChangeText={setConfirmation}
          testID="delete-input"
        />
        {remove.isError ? (
          <InlineNotice
            tone="error"
            testID="delete-error"
            message={
              isOfflineError(remove.error)
                ? 'You’re offline. Your account has not been deleted.'
                : errorMessage(remove.error)
            }
          />
        ) : null}
      </View>
    </AuthScreen>
  );
}
