import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';

import { Button, Input } from '@/components';
import { api } from '@/lib/api/client';
import { errorCode, errorMessage, isOfflineError } from '@/lib/api/error-message';
import { emailSchema } from '@/lib/schemas';
import { useAuthStore } from '@/stores/auth-store';

import { AuthHeader } from '../auth/AuthHeader';
import { AuthScreen } from '../auth/AuthScreen';
import { InlineNotice } from '../auth/InlineNotice';
import { OnboardingProgress } from './OnboardingProgress';

const formSchema = z.object({ email: emailSchema });

/** Optional: only for people who signed up by phone. Skipping shows a reminder on Profile. */
export function AddEmailScreen() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { control, handleSubmit, formState, setError } = useForm<
    z.input<typeof formSchema>,
    unknown,
    z.output<typeof formSchema>
  >({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' },
    mode: 'onTouched',
  });
  const save = useMutation({
    mutationFn: (email: string) => api.updateMe({ email }),
    onSuccess: (me) => {
      setUser(me);
      router.push('/username');
    },
    onError: (error) => {
      if (errorCode(error) === 'EMAIL_TAKEN') setError('email', { message: errorMessage(error) });
    },
  });

  if (user?.email) return <Redirect href="/username" />;

  const onSubmit = handleSubmit(({ email }) => save.mutate(email));

  return (
    <AuthScreen
      testID="add-email-screen"
      footer={
        <>
          <Button
            label="Continue"
            onPress={onSubmit}
            loading={save.isPending}
            testID="add-email-submit"
          />
          <Button
            label="Skip for now"
            variant="ghost"
            onPress={() => router.push('/username')}
            testID="add-email-skip"
          />
        </>
      }>
      <OnboardingProgress step={1} total={4} />
      <AuthHeader
        back={false}
        title="Add your email"
        subtitle="For receipts and to recover your account. We’ll send a link to confirm it."
      />
      <View className="gap-4">
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <Input
              label="Email address"
              placeholder="you@example.com"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect={false}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={formState.errors.email?.message}
              testID="add-email-input"
            />
          )}
        />
        {save.isError && errorCode(save.error) !== 'EMAIL_TAKEN' ? (
          <InlineNotice
            tone="error"
            message={
              isOfflineError(save.error)
                ? 'You’re offline. Try again when you’re connected.'
                : errorMessage(save.error)
            }
          />
        ) : null}
      </View>
    </AuthScreen>
  );
}
