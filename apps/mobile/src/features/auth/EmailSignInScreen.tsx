import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';

import { Button, Input } from '@/components';
import { errorMessage, isOfflineError } from '@/lib/api/error-message';
import { emailSchema } from '@/lib/schemas';

import { AuthHeader } from './AuthHeader';
import { AuthScreen } from './AuthScreen';
import { InlineNotice } from './InlineNotice';
import { useRequestOtp } from './use-request-otp';

const formSchema = z.object({ email: emailSchema });

export function EmailSignInScreen() {
  const request = useRequestOtp();
  const { control, handleSubmit, formState } = useForm<
    z.input<typeof formSchema>,
    unknown,
    z.output<typeof formSchema>
  >({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' },
    mode: 'onTouched',
  });

  const onSubmit = handleSubmit(({ email }) =>
    request.mutate(
      { destination: { kind: 'email', email }, channel: 'email' },
      { onSuccess: () => router.push('/verify') },
    ),
  );

  return (
    <AuthScreen
      testID="email-sign-in-screen"
      footer={
        <Button
          label="Send code"
          onPress={onSubmit}
          loading={request.isPending}
          testID="email-submit"
        />
      }>
      <AuthHeader title="Use your email" subtitle="We’ll email you a 6-digit code." />
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
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => onSubmit()}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={formState.errors.email?.message}
              testID="email-input"
            />
          )}
        />
        {request.isError ? (
          <InlineNotice
            tone="error"
            testID="email-error"
            message={
              isOfflineError(request.error)
                ? 'You’re offline. Check your connection and try again.'
                : errorMessage(request.error)
            }
          />
        ) : null}
      </View>
    </AuthScreen>
  );
}
