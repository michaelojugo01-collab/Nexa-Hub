import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button, EmptyState, ErrorState, Skeleton } from '@/components';
import { api } from '@/lib/api/client';
import { errorMessage, isOfflineError } from '@/lib/api/error-message';
import { MAX_INTERESTS } from '@/lib/schemas';
import { useAuthStore } from '@/stores/auth-store';

import { AuthHeader } from '../auth/AuthHeader';
import { AuthScreen } from '../auth/AuthScreen';
import { InlineNotice } from '../auth/InlineNotice';
import { InterestChip } from './InterestChip';
import { OnboardingProgress } from './OnboardingProgress';
import { useCategories } from './use-categories';

/** Toggle a tag; never allows more than MAX_INTERESTS. Exported for tests. */
export function toggleInterest(selected: string[], slug: string) {
  if (selected.includes(slug)) return selected.filter((s) => s !== slug);
  if (selected.length >= MAX_INTERESTS) return selected;
  return [...selected, slug];
}

/** Last onboarding step. Finishing (or skipping) lands on Home. */
export function InterestsScreen() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const finishOnboarding = useAuthStore((s) => s.finishOnboarding);
  const [selected, setSelected] = useState<string[]>(user?.interests ?? []);
  const categories = useCategories();
  const full = selected.length >= MAX_INTERESTS;

  const save = useMutation({
    mutationFn: () => api.updateMe({ interests: selected }),
    onSuccess: (me) => {
      setUser(me);
      finishOnboarding(); // route guard switches to the tabs (Home)
    },
  });

  let body;
  if (categories.isPending) {
    body = (
      <View className="flex-row flex-wrap gap-2" testID="interests-loading">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-28 rounded-full" />
        ))}
      </View>
    );
  } else if (categories.isError) {
    body = (
      <ErrorState
        testID="interests-error"
        variant={isOfflineError(categories.error) ? 'offline' : 'error'}
        onRetry={() => categories.refetch()}
        retrying={categories.isRefetching}
      />
    );
  } else if (categories.data.length === 0) {
    body = (
      <EmptyState
        testID="interests-empty"
        title="No topics yet"
        description="You can choose interests later from your profile."
      />
    );
  } else {
    body = (
      <View className="gap-4">
        <Text
          className="text-sm text-text-muted"
          accessibilityLiveRegion="polite"
          testID="interests-count">
          {full
            ? `${MAX_INTERESTS} of ${MAX_INTERESTS} chosen. Tap one to swap it.`
            : `${selected.length} of ${MAX_INTERESTS} chosen`}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {categories.data.map((c) => {
            const isSelected = selected.includes(c.slug);
            return (
              <InterestChip
                key={c.id}
                label={c.name}
                selected={isSelected}
                disabled={full && !isSelected}
                onPress={() => setSelected((s) => toggleInterest(s, c.slug))}
                testID={`interest-${c.slug}`}
              />
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <AuthScreen
      testID="interests-screen"
      footer={
        <>
          <Button
            label="Finish"
            onPress={() => save.mutate()}
            loading={save.isPending}
            disabled={selected.length === 0}
            testID="interests-submit"
          />
          <Button
            label="Skip for now"
            variant="ghost"
            onPress={finishOnboarding}
            testID="interests-skip"
          />
        </>
      }>
      <OnboardingProgress step={4} total={4} />
      <AuthHeader
        title="What are you into?"
        subtitle={`Pick up to ${MAX_INTERESTS}. We’ll tailor Home for you.`}
      />
      {body}
      {save.isError ? (
        <View className="pt-4">
          <InlineNotice
            tone="error"
            message={
              isOfflineError(save.error)
                ? 'You’re offline. Try again when you’re connected.'
                : errorMessage(save.error)
            }
          />
        </View>
      ) : null}
    </AuthScreen>
  );
}
