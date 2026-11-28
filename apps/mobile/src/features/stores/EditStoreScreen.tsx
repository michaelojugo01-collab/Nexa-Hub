import { zodResolver } from '@hookform/resolvers/zod';
import type { OwnStore, StoreUpdate } from '@nexa/api-contract';
import { router, Stack, useNavigation, usePreventRemove } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Alert, Platform, Text, View } from 'react-native';

import { Button, ErrorState, Input, Screen, Skeleton } from '@/components';
import { errorCode, errorMessage, isOfflineError } from '@/lib/api/error-message';
import { queryClient } from '@/lib/api/query-client';
import { queryKeys } from '@/lib/api/query-keys';
import { storeFormSchema, type StoreForm } from '@/lib/schemas';
import { normalizeSlugInput } from '@/lib/slug';
import { storeLinkLabel } from '@/lib/store-links';
import { InlineNotice } from '@/features/auth/InlineNotice';
import { toast } from '@/stores/toast-store';

import { ImageField } from './images/ImageField';
import { isUploadBusy, uploadIdOf, useImageUpload } from './images/use-image-upload';
import { BioField, CategoryPicker, SlugField } from './StoreFormFields';
import { useMyStore } from './use-my-store';
import { slugBlocksNext, useSlugAvailability } from './use-slug-availability';
import { useUpdateStore } from './use-update-store';

const SLUG_ERRORS = ['SLUG_TAKEN', 'SLUG_RESERVED', 'SLUG_INVALID', 'SLUG_CHANGE_USED'];

export function EditStoreScreen() {
  const store = useMyStore();

  if (store.isPending) {
    return (
      <Screen testID="edit-store-loading" edges={[]}>
        <View className="gap-4 pt-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-24 w-full" />
        </View>
      </Screen>
    );
  }
  if (store.isError || !store.data) {
    return (
      <Screen testID="edit-store-error" edges={[]}>
        <ErrorState
          className="flex-1"
          variant={isOfflineError(store.error) ? 'offline' : 'error'}
          message={store.isError ? errorMessage(store.error) : 'You don’t have a store yet.'}
          onRetry={() => void store.refetch()}
          retrying={store.isFetching}
        />
      </Screen>
    );
  }
  return <EditStoreForm store={store.data} />;
}

function EditStoreForm({ store }: { store: OwnStore }) {
  const navigation = useNavigation();
  const save = useUpdateStore();
  const avatar = useImageUpload('avatar');
  const banner = useImageUpload('banner');
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [removeBanner, setRemoveBanner] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const canChangeSlug = store.slugChangesRemaining > 0;

  const { control, handleSubmit, setError, formState, reset } = useForm<StoreForm>({
    resolver: zodResolver(storeFormSchema),
    defaultValues: {
      name: store.name,
      slug: store.slug,
      categorySlug: store.category?.slug ?? '',
      bio: store.bio ?? '',
    },
    mode: 'onChange',
  });
  const slug = useWatch({ control, name: 'slug' });
  const slugStatus = useSlugAvailability(slug, store.slug);
  const slugChanged = slug !== store.slug;
  const imagesChanged =
    avatar.state.status !== 'empty' ||
    banner.state.status !== 'empty' ||
    removeAvatar ||
    removeBanner;
  const dirty = formState.isDirty || imagesChanged;
  const busy = isUploadBusy(avatar.state) || isUploadBusy(banner.state);

  usePreventRemove(dirty && !save.isPending && !save.isSuccess, ({ data }) => {
    if (Platform.OS === 'web') return navigation.dispatch(data.action);
    Alert.alert('Discard changes?', 'Your edits haven’t been saved.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  function patchFrom(values: StoreForm): StoreUpdate {
    const patch: StoreUpdate = {};
    if (values.name.trim() !== store.name) patch.name = values.name.trim();
    if (slugChanged) patch.slug = values.slug;
    if (values.categorySlug !== (store.category?.slug ?? '')) {
      patch.categorySlug = values.categorySlug;
    }
    if (values.bio.trim() !== (store.bio ?? '')) patch.bio = values.bio.trim() || null;
    const avatarId = uploadIdOf(avatar.state);
    if (avatarId) patch.avatarUploadId = avatarId;
    else if (removeAvatar) patch.avatarUploadId = null;
    const bannerId = uploadIdOf(banner.state);
    if (bannerId) patch.bannerUploadId = bannerId;
    else if (removeBanner) patch.bannerUploadId = null;
    return patch;
  }

  function send(values: StoreForm) {
    setNotice(null);
    const patch = patchFrom(values);
    if (Object.keys(patch).length === 0) {
      router.back();
      return;
    }
    save.mutate(patch, {
      onSuccess: (saved) => {
        reset({
          name: saved.name,
          slug: saved.slug,
          categorySlug: saved.category?.slug ?? '',
          bio: saved.bio ?? '',
        });
        toast.show('Store saved', 'success');
        router.back();
      },
      onError: (error) => {
        const code = errorCode(error);
        if (code && SLUG_ERRORS.includes(code)) {
          queryClient.removeQueries({ queryKey: queryKeys.slugAvailability(values.slug) });
          setError('slug', { type: 'server', message: errorMessage(error) });
          return;
        }
        setNotice(
          isOfflineError(error)
            ? 'You’re offline. Your changes are kept; save again when you’re connected.'
            : errorMessage(error),
        );
      },
    });
  }

  const onSave = handleSubmit((values) => {
    if (!slugChanged || Platform.OS === 'web') return send(values);
    Alert.alert(
      'Change your store link?',
      `You can only do this once. ${storeLinkLabel(store.slug)} will redirect to ${storeLinkLabel(values.slug)}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Change link', onPress: () => send(values) },
      ],
    );
  });

  const slugServerError = formState.errors.slug?.type === 'server';
  const saveDisabled =
    busy || !dirty || (slugChanged && (slugBlocksNext(slugStatus) || slugServerError));

  return (
    <Screen scroll testID="edit-store" edges={[]} className="gap-5 pt-4">
      <Stack.Screen
        options={{
          title: 'Edit store',
          headerRight: () => (
            <Button
              label="Save"
              size="sm"
              variant="ghost"
              onPress={() => void onSave()}
              loading={save.isPending}
              disabled={saveDisabled}
              testID="edit-store-save-header"
            />
          ),
        }}
      />
      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <Input
            label="Store name"
            autoCapitalize="words"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={formState.errors.name?.message}
            testID="edit-store-name"
          />
        )}
      />
      <View className="gap-2">
        <Controller
          control={control}
          name="slug"
          render={({ field }) => (
            <SlugField
              value={field.value}
              onChange={(text) => field.onChange(normalizeSlugInput(text))}
              onBlur={field.onBlur}
              status={slugStatus}
              disabled={!canChangeSlug}
              error={slugServerError ? formState.errors.slug?.message : undefined}
              helper={
                canChangeSlug
                  ? undefined
                  : store.previousSlug
                    ? `You’ve used your one link change. ${storeLinkLabel(store.previousSlug)} redirects here.`
                    : 'You’ve used your one link change.'
              }
              testID="edit-store-slug"
            />
          )}
        />
        {canChangeSlug && slugChanged ? (
          <InlineNotice
            tone="warning"
            message={`You can change your link only once. Your old link, ${storeLinkLabel(store.slug)}, will redirect to the new one.`}
            testID="edit-store-slug-warning"
          />
        ) : null}
      </View>
      <Controller
        control={control}
        name="categorySlug"
        render={({ field }) => (
          <CategoryPicker
            value={field.value}
            onChange={(value) => field.onChange(value)}
            error={formState.errors.categorySlug?.message}
            testID="edit-store-category"
          />
        )}
      />
      <Controller
        control={control}
        name="bio"
        render={({ field }) => (
          <BioField
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            error={formState.errors.bio?.message}
            testID="edit-store-bio"
          />
        )}
      />
      <ImageField
        kind="avatar"
        label="Profile picture"
        state={avatar.state}
        currentUri={removeAvatar ? null : (store.avatar?.medium ?? null)}
        onPicked={(uri, crop) => {
          setRemoveAvatar(false);
          void avatar.start(uri, crop);
        }}
        onRetry={avatar.retry}
        onRemove={avatar.remove}
        onRemoveCurrent={() => setRemoveAvatar(true)}
        testID="edit-store-avatar"
      />
      <ImageField
        kind="banner"
        label="Banner"
        state={banner.state}
        currentUri={removeBanner ? null : (store.banner?.medium ?? null)}
        onPicked={(uri, crop) => {
          setRemoveBanner(false);
          void banner.start(uri, crop);
        }}
        onRetry={banner.retry}
        onRemove={banner.remove}
        onRemoveCurrent={() => setRemoveBanner(true)}
        testID="edit-store-banner"
      />
      {notice ? <InlineNotice tone="error" message={notice} testID="edit-store-notice" /> : null}
      <Text className="text-xs text-text-muted">
        Visibility (public or private) is on your store dashboard.
      </Text>
      <Button
        label="Save changes"
        onPress={() => void onSave()}
        loading={save.isPending}
        disabled={saveDisabled}
        fullWidth
        testID="edit-store-save"
      />
    </Screen>
  );
}
