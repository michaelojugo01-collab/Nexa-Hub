import { zodResolver } from '@hookform/resolvers/zod';
import type { MeUpdate } from '@nexa/api-contract';
import { useMutation } from '@tanstack/react-query';
import { router, Stack, useNavigation, usePreventRemove } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Alert, Platform, View } from 'react-native';

import { Avatar, Button, Input } from '@/components';
import { api } from '@/lib/api/client';
import { errorCode, errorMessage, isOfflineError } from '@/lib/api/error-message';
import { BIO_MAX, profileFormSchema, type ProfileForm } from '@/lib/schemas';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from '@/stores/toast-store';

import { AuthScreen } from '../auth/AuthScreen';
import { InlineNotice } from '../auth/InlineNotice';
import { pickAvatar } from '../profile/pick-avatar';
import { applyMe } from '../profile/use-me';
import {
  useUsernameAvailability,
  usernameBlocksSave,
  usernameFieldText,
} from '../profile/use-username-availability';

export function EditProfileScreen() {
  const user = useAuthStore((s) => s.user)!;
  const localAvatarUri = useAuthStore((s) => s.localAvatarUri);
  const setLocalAvatarUri = useAuthStore((s) => s.setLocalAvatarUri);
  const navigation = useNavigation();
  const [photo, setPhoto] = useState(localAvatarUri);

  const { control, handleSubmit, formState, setError, reset } = useForm<ProfileForm>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: user.displayName ?? '',
      username: user.username ?? '',
      bio: user.bio ?? '',
    },
    mode: 'onTouched',
  });
  const username = useWatch({ control, name: 'username' });
  const bio = useWatch({ control, name: 'bio' });
  const availability = useUsernameAvailability(username, user.username);
  const usernameText = usernameFieldText(availability);
  const photoChanged = photo !== localAvatarUri;
  const dirty = formState.isDirty || photoChanged;

  const save = useMutation({
    mutationFn: async (values: ProfileForm) => {
      const patch: MeUpdate = {};
      if (values.displayName !== (user.displayName ?? '')) patch.displayName = values.displayName;
      if (values.username !== user.username) patch.username = values.username;
      if (values.bio !== (user.bio ?? '')) patch.bio = values.bio || null;
      const me = Object.keys(patch).length ? await api.updateMe(patch) : null;
      if (photoChanged) await setLocalAvatarUri(photo);
      return { me, values };
    },
    onSuccess: ({ me, values }) => {
      if (me) applyMe(me);
      reset(values);
      toast.show('Profile saved', 'success');
      router.back();
    },
    onError: (error) => {
      const code = errorCode(error);
      if (code?.startsWith('USERNAME_')) setError('username', { message: errorMessage(error) });
    },
  });

  usePreventRemove(dirty && !save.isPending && !save.isSuccess, ({ data }) => {
    if (Platform.OS === 'web') return;
    Alert.alert('Discard changes?', 'Your edits haven’t been saved.', [
      { text: 'Keep editing', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          reset();
          setPhoto(localAvatarUri);
          navigation.dispatch(data.action);
        },
      },
    ]);
  });

  const onSubmit = handleSubmit((values) => save.mutate(values));

  return (
    <AuthScreen
      testID="edit-profile-screen"
      footer={
        <Button
          label="Save"
          onPress={onSubmit}
          loading={save.isPending}
          disabled={
            !dirty || (usernameBlocksSave(availability) && availability.state !== 'invalid')
          }
          testID="edit-profile-save"
        />
      }>
      <Stack.Screen options={{ title: 'Edit profile' }} />
      <View className="items-center gap-2 py-4">
        <Avatar name={user.displayName ?? 'You'} uri={photo ?? user.avatarUrl} size="xl" />
        <View className="flex-row gap-2">
          <Button
            label="Change photo"
            size="sm"
            variant="secondary"
            onPress={async () => {
              try {
                const uri = await pickAvatar();
                if (uri) setPhoto(uri);
              } catch {
                toast.show('We couldn’t open your photos.', 'error');
              }
            }}
            testID="edit-profile-photo"
          />
          {photo ? (
            <Button label="Remove" size="sm" variant="ghost" onPress={() => setPhoto(null)} />
          ) : null}
        </View>
      </View>
      <View className="gap-4">
        <Controller
          control={control}
          name="displayName"
          render={({ field }) => (
            <Input
              label="Name"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={formState.errors.displayName?.message}
              testID="edit-name"
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
              autoCapitalize="none"
              autoCorrect={false}
              value={field.value}
              onChangeText={(t) => field.onChange(t.toLowerCase().replace(/\s/g, ''))}
              onBlur={field.onBlur}
              error={formState.errors.username?.message ?? usernameText.error}
              helper={usernameText.helper}
              testID="edit-username"
            />
          )}
        />
        <Controller
          control={control}
          name="bio"
          render={({ field }) => (
            <Input
              label="Bio"
              placeholder="What do you make or sell?"
              multiline
              maxLength={BIO_MAX}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={formState.errors.bio?.message}
              helper={`${bio.length}/${BIO_MAX}`}
              testID="edit-bio"
            />
          )}
        />
        {save.isError && !errorCode(save.error)?.startsWith('USERNAME_') ? (
          <InlineNotice
            tone="error"
            message={
              isOfflineError(save.error)
                ? 'You’re offline. Your changes are still here — try again when connected.'
                : errorMessage(save.error)
            }
          />
        ) : null}
      </View>
    </AuthScreen>
  );
}
