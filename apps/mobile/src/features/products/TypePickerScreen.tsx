import type { ProductTypeDef } from '@nexa/api-contract';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, SectionList, Text, View } from 'react-native';

import { EmptyState, ErrorState, Input, Screen, Skeleton } from '@/components';
import { api } from '@/lib/api/client';
import { errorMessage, isOfflineError } from '@/lib/api/error-message';
import { InlineNotice } from '@/features/auth/InlineNotice';

import { modeWords } from './product-ui';
import { applyOwnProduct } from './use-own-product';
import { useProductTypes } from './use-product-types';

/** Create product, step 1 of 5: pick a type (grouped and searchable, all from the API). */
export function TypePickerScreen() {
  const types = useProductTypes();
  const [query, setQuery] = useState('');
  const create = useMutation({
    mutationFn: (type: ProductTypeDef) => api.createProduct({ typeCode: type.code }),
    onSuccess: (product) => {
      applyOwnProduct(product);
      router.replace({ pathname: '/seller/products/[id]', params: { id: product.id } });
    },
  });

  const q = query.trim().toLowerCase();
  const matches = (types.data ?? []).filter(
    (t) => !q || `${t.name} ${t.description} ${t.group}`.toLowerCase().includes(q),
  );
  const sections = [...new Set(matches.map((t) => t.group))].map((group) => ({
    title: group,
    data: matches.filter((t) => t.group === group),
  }));

  return (
    <Screen testID="type-picker" edges={[]} padded={false}>
      <View className="gap-2 px-4 pb-2 pt-3">
        <Text className="text-xs font-medium text-text-muted">Step 1 of 5 · Type</Text>
        <Text accessibilityRole="header" className="text-2xl font-bold text-text">
          What are you selling?
        </Text>
        <Input
          label="Search"
          placeholder="e.g. ebook, beats, Notion"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          testID="type-search"
        />
        {create.isError ? (
          <InlineNotice
            tone="error"
            message={
              isOfflineError(create.error)
                ? 'You’re offline. Connect to start a product; after that, your work is saved on this phone too.'
                : errorMessage(create.error)
            }
            testID="type-create-error"
          />
        ) : null}
      </View>

      {types.isPending ? (
        <View className="gap-3 px-4" testID="type-loading">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </View>
      ) : types.isError ? (
        <ErrorState
          className="flex-1"
          variant={isOfflineError(types.error) ? 'offline' : 'error'}
          message={errorMessage(types.error)}
          onRetry={() => void types.refetch()}
          retrying={types.isFetching}
          testID="type-error"
        />
      ) : sections.length === 0 ? (
        <EmptyState
          className="flex-1"
          icon="search-outline"
          title="No types match"
          description="Try another word, or pick from the full list."
          actionLabel="Clear search"
          onAction={() => setQuery('')}
          testID="type-empty"
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(t) => t.code}
          contentContainerClassName="px-4 pb-8"
          keyboardShouldPersistTaps="handled"
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text
              accessibilityRole="header"
              className="pb-2 pt-4 text-sm font-semibold text-text-muted">
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => create.mutate(item)}
              disabled={create.isPending}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}. ${item.description}`}
              accessibilityState={{
                busy: create.isPending && create.variables?.code === item.code,
              }}
              testID={`type-${item.code}`}
              className="mb-2 gap-1 rounded-lg border border-border bg-surface p-4 active:bg-surface-muted">
              <Text className="text-base font-semibold text-text">{item.name}</Text>
              <Text className="text-sm text-text-muted">{item.description}</Text>
              <Text className="text-xs font-medium text-text" testID={`type-${item.code}-mode`}>
                {item.modes.map((m) => modeWords[m].buyer).join(' Or: ')}
              </Text>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
