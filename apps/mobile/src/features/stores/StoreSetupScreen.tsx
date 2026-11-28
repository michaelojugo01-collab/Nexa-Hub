import Ionicons from '@expo/vector-icons/Ionicons';
import { zodResolver } from '@hookform/resolvers/zod';
import type { OwnStore } from '@nexa/api-contract';
import { useMutation } from '@tanstack/react-query';
import { router, useNavigation, usePreventRemove } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { Button, Card, Input, Screen, StoreHeader } from '@/components';
import { api } from '@/lib/api/client';
import { queryClient } from '@/lib/api/query-client';
import { queryKeys } from '@/lib/api/query-keys';
import { errorCode, errorMessage, isOfflineError } from '@/lib/api/error-message';
import { storeFormSchema, type StoreForm } from '@/lib/schemas';
import { normalizeSlugInput, suggestSlug } from '@/lib/slug';
import { storeLinkLabel } from '@/lib/store-links';
import { InlineNotice } from '@/features/auth/InlineNotice';
import { useCategories } from '@/features/onboarding/use-categories';
import { toast } from '@/stores/toast-store';
import { useTheme } from '@/theme/ThemeProvider';

import { ImageField } from './images/ImageField';
import { isUploadBusy, uploadedUri, uploadIdOf, useImageUpload } from './images/use-image-upload';
import { BioField, CategoryPicker, SlugField } from './StoreFormFields';
import { applyOwnStore } from './use-my-store';
import { slugBlocksNext, useSlugAvailability } from './use-slug-availability';

const STEPS = ['Name and link', 'Category and bio', 'Photos', 'Review'] as const;
const SLUG_ERRORS = ['SLUG_TAKEN', 'SLUG_RESERVED', 'SLUG_INVALID'];

/**
 * Store setup (aim: under 2 minutes). Four short steps with a progress bar. The draft lives
 * in memory: closing the app starts again from step 1.
 */
export function StoreSetupScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [step, setStep] = useState(0);
  const [slugEdited, setSlugEdited] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const avatar = useImageUpload('avatar');
  const banner = useImageUpload('banner');
  const categories = useCategories();

  const { control, setValue, setError, trigger, getValues, formState } = useForm<StoreForm>({
    resolver: zodResolver(storeFormSchema),
    defaultValues: { name: '', slug: '', categorySlug: '', bio: '' },
    mode: 'onChange',
  });
  const [name, slug, categorySlug, bio] = useWatch({
    control,
    name: ['name', 'slug', 'categorySlug', 'bio'],
  });
  const slugStatus = useSlugAvailability(slug);

  const publish = useMutation({
    mutationFn: () => {
      const values = getValues();
      return api.createStore({
        name: values.name.trim(),
        slug: values.slug,
        categorySlug: values.categorySlug,
        bio: values.bio.trim() || null,
        avatarUploadId: uploadIdOf(avatar.state) ?? null,
        bannerUploadId: uploadIdOf(banner.state) ?? null,
        visibility: 'public',
      });
    },
    onSuccess: async (store: OwnStore) => {
      await applyOwnStore(store);
      router.replace('/seller/published');
    },
    onError: (error) => {
      const code = errorCode(error);
      if (code && SLUG_ERRORS.includes(code)) {
        // Someone took the link since the live check: back to step 1 with the reason.
        queryClient.removeQueries({ queryKey: queryKeys.slugAvailability(getValues('slug')) });
        setStep(0);
        setError('slug', { type: 'server', message: errorMessage(error) });
        return;
      }
      if (code === 'STORE_EXISTS') {
        toast.show(errorMessage(error), 'info');
        router.replace('/store');
        return;
      }
      setNotice(
        isOfflineError(error)
          ? 'You’re offline. Your details are kept; publish again when you’re connected.'
          : errorMessage(error),
      );
    },
  });

  const dirty = !!name || !!slug || !!categorySlug || !!bio || avatar.state.status !== 'empty';
  usePreventRemove(dirty && !publish.isPending && !publish.isSuccess, ({ data }) => {
    if (Platform.OS === 'web') return navigation.dispatch(data.action);
    Alert.alert('Leave store setup?', 'What you’ve entered so far will be lost.', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  function onNameChange(text: string, onChange: (value: string) => void) {
    onChange(text);
    if (!slugEdited) setValue('slug', suggestSlug(text), { shouldValidate: true });
  }

  async function next() {
    setNotice(null);
    if (step === 0) {
      const ok = await trigger(['name', 'slug']);
      if (!ok || slugBlocksNext(slugStatus)) return;
    }
    if (step === 1 && !(await trigger(['categorySlug', 'bio']))) return;
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  function back() {
    setNotice(null);
    if (step === 0) router.back();
    else setStep((s) => s - 1);
  }

  const imagesBusy = isUploadBusy(avatar.state) || isUploadBusy(banner.state);
  const failedImages = [avatar.state, banner.state].some((s) => s.status === 'failed');
  const category = categories.data?.find((c) => c.slug === categorySlug);
  const slugServerError = formState.errors.slug?.type === 'server';

  return (
    <Screen testID="store-setup" edges={['top', 'bottom']}>
      <View className="flex-row items-center gap-3 py-3">
        <Pressable
          onPress={back}
          accessibilityRole="button"
          accessibilityLabel={step === 0 ? 'Close store setup' : 'Previous step'}
          hitSlop={12}
          testID="setup-back">
          <Ionicons name={step === 0 ? 'close' : 'arrow-back'} size={24} color={colors.text} />
        </Pressable>
        <View className="flex-1 gap-1">
          <Text className="text-xs font-medium text-text-muted" testID="setup-step-label">
            Step {step + 1} of {STEPS.length} · {STEPS[step]}
          </Text>
          <View
            className="h-1 w-full overflow-hidden rounded-full bg-surface-muted"
            accessibilityRole="progressbar"
            accessibilityLabel="Store setup progress"
            accessibilityValue={{ min: 1, max: STEPS.length, now: step + 1 }}
            testID="setup-progress">
            <View
              className="h-full bg-primary"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 pb-8 pt-4"
        keyboardShouldPersistTaps="handled">
        {step === 0 ? (
          <View className="gap-5" testID="setup-step-name">
            <Text accessibilityRole="header" className="text-2xl font-bold text-text">
              Name your store
            </Text>
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <Input
                  label="Store name"
                  placeholder="e.g. Bisi Bakes"
                  autoCapitalize="words"
                  autoFocus
                  value={field.value}
                  onChangeText={(text) => onNameChange(text, field.onChange)}
                  onBlur={field.onBlur}
                  error={formState.errors.name?.message}
                  testID="setup-name"
                />
              )}
            />
            <Controller
              control={control}
              name="slug"
              render={({ field }) => (
                <SlugField
                  value={field.value}
                  onChange={(text) => {
                    setSlugEdited(true);
                    field.onChange(normalizeSlugInput(text));
                  }}
                  onBlur={field.onBlur}
                  status={slugStatus}
                  error={slugServerError ? formState.errors.slug?.message : undefined}
                  testID="setup-slug"
                />
              )}
            />
            {slug ? (
              <Card className="gap-1 bg-surface-muted" testID="setup-link-preview">
                <Text className="text-xs text-text-muted">Your link</Text>
                <Text className="text-base font-semibold text-text">{storeLinkLabel(slug)}</Text>
              </Card>
            ) : null}
          </View>
        ) : null}

        {step === 1 ? (
          <View className="gap-5" testID="setup-step-about">
            <Text accessibilityRole="header" className="text-2xl font-bold text-text">
              What do you sell?
            </Text>
            <Controller
              control={control}
              name="categorySlug"
              render={({ field }) => (
                <CategoryPicker
                  value={field.value}
                  onChange={(value) => field.onChange(value)}
                  error={formState.errors.categorySlug?.message}
                  testID="setup-category"
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
                  testID="setup-bio"
                />
              )}
            />
          </View>
        ) : null}

        {step === 2 ? (
          <View className="gap-5" testID="setup-step-photos">
            <View className="gap-1">
              <Text accessibilityRole="header" className="text-2xl font-bold text-text">
                Add photos
              </Text>
              <Text className="text-sm text-text-muted">
                Optional. Stores with a photo get more visits. You can add them later.
              </Text>
            </View>
            <ImageField
              kind="avatar"
              label="Profile picture"
              state={avatar.state}
              onPicked={(uri, crop) => void avatar.start(uri, crop)}
              onRetry={avatar.retry}
              onRemove={avatar.remove}
              testID="setup-avatar"
            />
            <ImageField
              kind="banner"
              label="Banner"
              state={banner.state}
              onPicked={(uri, crop) => void banner.start(uri, crop)}
              onRetry={banner.retry}
              onRemove={banner.remove}
              testID="setup-banner"
            />
            {failedImages ? (
              <Text className="text-sm text-text-muted">
                Photos that didn’t upload won’t be added. Retry, or continue without them.
              </Text>
            ) : null}
          </View>
        ) : null}

        {step === 3 ? (
          <View className="gap-5" testID="setup-step-review">
            <Text accessibilityRole="header" className="text-2xl font-bold text-text">
              Review and publish
            </Text>
            <Card flush>
              <StoreHeader
                name={name.trim()}
                slug={slug}
                bio={bio.trim() || null}
                avatarUrl={uploadedUri(avatar.state)}
                coverUrl={uploadedUri(banner.state)}
                followerCount={0}
                productCount={0}
                className="pb-4"
                testID="setup-preview"
              />
            </Card>
            <Card className="gap-3">
              <ReviewRow label="Link" value={storeLinkLabel(slug)} onEdit={() => setStep(0)} />
              <ReviewRow
                label="Category"
                value={category?.name ?? categorySlug}
                onEdit={() => setStep(1)}
              />
            </Card>
            {notice ? <InlineNotice tone="error" message={notice} testID="setup-notice" /> : null}
          </View>
        ) : null}
      </ScrollView>

      <View className="gap-2 py-3">
        {step < 3 ? (
          <Button
            label={
              step === 2 && avatar.state.status === 'empty' && banner.state.status === 'empty'
                ? 'Skip for now'
                : 'Next'
            }
            variant={
              step === 2 && avatar.state.status === 'empty' && banner.state.status === 'empty'
                ? 'secondary'
                : 'primary'
            }
            onPress={() => void next()}
            disabled={
              (step === 0 && (slugBlocksNext(slugStatus) || slugServerError)) ||
              (step === 2 && imagesBusy)
            }
            fullWidth
            testID="setup-next"
          />
        ) : (
          <Button
            label="Publish store"
            onPress={() => publish.mutate()}
            loading={publish.isPending}
            fullWidth
            testID="setup-publish"
          />
        )}
      </View>
    </Screen>
  );
}

function ReviewRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <View className="flex-1">
        <Text className="text-xs text-text-muted">{label}</Text>
        <Text className="text-base text-text">{value}</Text>
      </View>
      <Button label="Edit" size="sm" variant="ghost" onPress={onEdit} />
    </View>
  );
}
