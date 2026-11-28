import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { View } from 'react-native';

import { Button, Input } from '@/components';
import { api } from '@/lib/api/client';
import { errorCode, errorMessage, isOfflineError } from '@/lib/api/error-message';
import { nameUsernameSchema, type NameUsernameForm } from '@/lib/schemas';
import { useAuthStore } from '@/stores/auth-store';

import { AuthHeader } from '../auth/AuthHeader';
import { AuthScreen } from '../auth/AuthScreen';
import { InlineNotice } from '../auth/InlineNotice';
import {
  useUsernameAvailability,
  usernameBlocksSave,
  usernameFieldText,
} from '../profile/use-username-availability';
import { OnboardingProgress } from './OnboardingProgress';

/** Required step: a display name and a unique username. */
export function UsernameScreen() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { control, handleSubmit, formState, setError } = useForm<NameUsernameForm>({
    resolver: zodResolver(nameUsernameSchema),
    defaultValues: { displayName: user?.displayName ?? '', username: user?.username ?? '' },
    mode: 'onTouched',
  });
  const username = useWatch({ control, name: 'username' });
  const availability = useUsernameAvailability(username);
  const usernameText = usernameFieldText(availability);

  const save = useMutation({
    mutationFn: (values: NameUsernameForm) => api.updateMe(values),
    onSuccess: (me) => {
      setUser(me);
      router.push('/photo');
    },
    onError: (error) => {
      const code = errorCode(error);
      if (
        code === 'USERNAME_TAKEN' ||
        code === 'USERNAME_RESERVED' ||
        code === 'USERNAME_INVALID'
      ) {
        setError('username', { message: errorMessage(error) });
      }
    },
  });

  const onSubmit = handleSubmit((values) => save.mutate(values));
  const blocked = usernameBlocksSave(availability);

  return (
    <AuthScreen
      testID="username-screen"
      footer={
        <Button
          label="Continue"
          onPress={onSubmit}
          loading={save.isPending}
          disabled={blocked && !formState.errors.username}
          testID="username-submit"
        />
      }>
      <OnboardingProgress step={2} total={4} />
      <AuthHeader
        title="Set up your profile"
        subtitle="This is how buyers and sellers will find you."
      />
      <View className="gap-4">
        <Controller
          control={control}
          name="displayName"
          render={({ field }) => (
            <Input
              label="Your name"
              placeholder="e.g. Chidi Nwosu"
              textContentType="name"
              autoComplete="name"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={formState.errors.displayName?.message}
              testID="display-name-input"
            />
          )}
        />
        <Controller
          control={control}
          name="username"
          render={({ field }) => (
            <Input
              label="Username"
              prefix="@"
              placeholder="chidi_n"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="username"
              value={field.value}
              onChangeText={(t) => field.onChange(t.toLowerCase().replace(/\s/g, ''))}
              onBlur={field.onBlur}
              error={formState.errors.username?.message ?? usernameText.error}
              helper={usernameText.helper}
              testID="username-input"
            />
          )}
        />
        {save.isError && !formState.errors.username ? (
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
