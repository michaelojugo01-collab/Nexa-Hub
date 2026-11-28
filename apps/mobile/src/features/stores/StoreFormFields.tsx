import { Text, View } from 'react-native';

import { ErrorState, Input, Skeleton } from '@/components';
import { errorMessage, isOfflineError } from '@/lib/api/error-message';
import { STORE_BIO_MAX } from '@/lib/schemas';
import { STORE_LINK_DOMAIN } from '@/lib/store-links';
import { InterestChip } from '@/features/onboarding/InterestChip';
import { useCategories } from '@/features/onboarding/use-categories';

import { slugFieldText, type SlugStatus } from './use-slug-availability';

/** Store link field: "nexahub.app/" prefix, live availability under it. */
export function SlugField({
  value,
  onChange,
  onBlur,
  status,
  error,
  disabled,
  helper,
  testID = 'store-slug',
}: {
  value: string;
  onChange: (text: string) => void;
  onBlur?: () => void;
  status: SlugStatus;
  /** A server error from publishing / saving wins over the live check. */
  error?: string;
  disabled?: boolean;
  helper?: string;
  testID?: string;
}) {
  const text = slugFieldText(status);
  return (
    <Input
      label="Store link"
      prefix={`${STORE_LINK_DOMAIN}/`}
      value={value}
      onChangeText={onChange}
      onBlur={onBlur}
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete="off"
      disabled={disabled}
      error={error ?? text.error}
      helper={helper ?? text.helper}
      testID={testID}
    />
  );
}

/** "0/150" counter that turns into the error past the limit (zod decides). */
export function BioField({
  value,
  onChange,
  onBlur,
  error,
  testID = 'store-bio',
}: {
  value: string;
  onChange: (text: string) => void;
  onBlur?: () => void;
  error?: string;
  testID?: string;
}) {
  const length = value.trim().length;
  const over = length > STORE_BIO_MAX;
  return (
    <Input
      label="Bio (optional)"
      placeholder="What do you sell? Who is it for?"
      multiline
      textAlignVertical="top"
      value={value}
      onChangeText={onChange}
      onBlur={onBlur}
      error={over ? `${length}/${STORE_BIO_MAX} · ${error ?? 'Too long'}` : error}
      helper={`${length}/${STORE_BIO_MAX}`}
      testID={testID}
    />
  );
}

/** One category, from GET /v1/discover/categories (data, not code). */
export function CategoryPicker({
  value,
  onChange,
  error,
  testID = 'store-category',
}: {
  value: string;
  onChange: (slug: string) => void;
  error?: string;
  testID?: string;
}) {
  const categories = useCategories();

  if (categories.isPending) {
    return (
      <View className="flex-row flex-wrap gap-2" testID={`${testID}-loading`}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-10 w-24 rounded-full" />
        ))}
      </View>
    );
  }
  if (categories.isError) {
    return (
      <ErrorState
        variant={isOfflineError(categories.error) ? 'offline' : 'error'}
        message={errorMessage(categories.error)}
        onRetry={() => void categories.refetch()}
        retrying={categories.isFetching}
        testID={`${testID}-error`}
      />
    );
  }
  if (categories.data.length === 0) {
    return (
      <Text className="text-sm text-text-muted" testID={`${testID}-empty`}>
        No categories yet. Please try again later.
      </Text>
    );
  }
  return (
    <View className="gap-2" accessibilityRole="radiogroup" accessibilityLabel="Category">
      <Text className="text-sm font-medium text-text">Category</Text>
      <View className="flex-row flex-wrap gap-2" testID={testID}>
        {categories.data.map((c) => (
          <InterestChip
            key={c.slug}
            label={c.name}
            selected={value === c.slug}
            onPress={() => onChange(c.slug)}
            testID={`${testID}-${c.slug}`}
          />
        ))}
      </View>
      {error ? <Text className="text-xs text-error">{error}</Text> : null}
    </View>
  );
}
