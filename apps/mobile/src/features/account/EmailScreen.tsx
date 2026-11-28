import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';
import { z } from 'zod';

import { Button, Input } from '@/components';
import { api } from '@/lib/api/client';
import { errorCode, errorMessage, isOfflineError } from '@/lib/api/error-message';
import { emailSchema } from '@/lib/schemas';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from '@/stores/toast-store';

import { AuthScreen } from '../auth/AuthScreen';
import { InlineNotice } from '../auth/InlineNotice';
import { applyMe } from '../profile/use-me';

const formSchema = z.object({ email: emailSchema });

/** Add or change the email, and resend the verification link (proposed endpoint). */
export function EmailScreen() {
  const user = useAuthStore((s) => s.user)!;
  const { control, handleSubmit, formState, setError } = useForm<
    z.input<typeof formSchema>,
    unknown,
    z.output<typeof formSchema>
  >({
    resolver: zodResolver(formSchema),
    defaultValues: { email: user.email ?? '' },
    mode: 'onTouched',
  });

  const save = useMutation({
    mutationFn: (email: string) => api.updateMe({ email }),
    onSuccess: (me) => {
      applyMe(me);
      toast.show(`We sent a verification link to ${me.email}`, 'success');
      router.back();
    },
    onError: (error) => {
      if (errorCode(error) === 'EMAIL_TAKEN') setError('email', { message: errorMessage(error) });
    },
  });
  const resend = useMutation({
    mutationFn: () => api.sendEmailVerification(),
    onSuccess: (r) => toast.show(`Link sent to ${r.sentTo}`, 'success'),
  });

  const failed =
    save.isError && errorCode(save.error) !== 'EMAIL_TAKEN' ? save.error : resend.error;

  return (
    <AuthScreen
      testID="email-screen"
      footer={
        <Button
          label={user.email ? 'Update email' : 'Add email'}
          onPress={handleSubmit(({ email }) => save.mutate(email))}
          loading={save.isPending}
          disabled={!formState.isDirty}
          testID="email-save"
        />
      }>
      <Stack.Screen options={{ title: 'Email' }} />
      <View className="gap-4 pt-4">
        {user.email ? (
          <Text className="text-sm text-text-muted" testID="email-status">
            {user.emailVerified
              ? `${user.email} is verified.`
              : `${user.email} isn’t verified yet. Check your inbox for the link.`}
          </Text>
        ) : null}
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <Input
              label="Email address"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={formState.errors.email?.message}
              helper="Changing it sends a new verification link."
              testID="email-field"
            />
          )}
        />
        {user.email && !user.emailVerified ? (
          <Button
            label="Resend verification link"
            variant="secondary"
            loading={resend.isPending}
            onPress={() => resend.mutate()}
            testID="email-resend"
          />
        ) : null}
        {failed ? (
          <InlineNotice
            tone="error"
            message={
              isOfflineError(failed)
                ? 'You’re offline. Try again when you’re connected.'
                : errorMessage(failed)
            }
          />
        ) : null}
      </View>
    </AuthScreen>
  );
}
