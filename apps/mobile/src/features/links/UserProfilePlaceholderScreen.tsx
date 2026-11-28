import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { Avatar, Button, EmptyState, ErrorState, Skeleton } from '@/components';
import { errorCode, errorMessage, isOfflineError } from '@/lib/api/error-message';

import { LinkScreenFrame } from './LinkScreenFrame';
import { usePublicProfile } from './use-public-profile';

/** PLACEHOLDER public profile screen for /@{username} links. */
export function UserProfilePlaceholderScreen() {
  const params = useLocalSearchParams<{ username: string }>();
  const username = (params.username ?? '').toLowerCase();
  const query = usePublicProfile(username);

  let body;
  if (query.isPending) {
    body = (
      <View className="gap-3 px-4" testID="user-loading">
        <Skeleton className="h-24 w-24 rounded-full" />
        <Skeleton className="h-6 w-1/2" />
      </View>
    );
  } else if (query.isError) {
    body =
      errorCode(query.error) === 'NOT_FOUND' ? (
        <EmptyState
          className="flex-1"
          icon="person-outline"
          title="Profile not found"
          description={`There’s no one called @${username} on Nexa Hub.`}
          actionLabel="Go home"
          onAction={() => router.replace('/')}
          testID="user-not-found"
        />
      ) : (
        <ErrorState
          className="flex-1"
          variant={isOfflineError(query.error) ? 'offline' : 'error'}
          message={errorMessage(query.error)}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
          testID="user-error"
        />
      );
  } else {
    const profile = query.data;
    const name = profile.displayName ?? `@${profile.username}`;
    body = (
      <View className="gap-3 px-4">
        <Avatar name={name} uri={profile.avatarUrl} size="xl" />
        <Text accessibilityRole="header" className="text-2xl font-bold text-text">
          {name}
        </Text>
        <Text className="text-sm text-text-muted">@{profile.username}</Text>
        {profile.bio ? <Text className="text-base text-text">{profile.bio}</Text> : null}
        {profile.store ? (
          <Button
            label={`Visit ${profile.store.name}`}
            onPress={() =>
              router.push({ pathname: '/store/[slug]', params: { slug: profile.store!.slug } })
            }
            testID="user-visit-store"
          />
        ) : null}
      </View>
    );
  }

  return <LinkScreenFrame testID="user-screen">{body}</LinkScreenFrame>;
}
