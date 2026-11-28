import { router } from 'expo-router';
import { useState } from 'react';
import { Switch, Text, View } from 'react-native';

import {
  Avatar,
  Badge,
  Button,
  Card,
  ErrorState,
  ListItem,
  Screen,
  Sheet,
  Skeleton,
} from '@/components';
import { isOfflineError } from '@/lib/api/error-message';
import { logout } from '@/lib/auth/session';
import { formatNigerianPhone } from '@/lib/phone';
import { useAuthStore } from '@/stores/auth-store';
import { useTheme } from '@/theme/ThemeProvider';

import { BecomeSellerSheet } from './BecomeSellerSheet';
import { isSeller } from './is-seller';
import { useMe } from './use-me';

function ProfileSkeleton() {
  return (
    <View className="items-center gap-3 pt-8" testID="profile-loading">
      <Skeleton className="h-24 w-24 rounded-full" />
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-4 w-24" />
    </View>
  );
}

export function ProfileScreen() {
  const { colors } = useTheme();
  const me = useMe();
  const localAvatarUri = useAuthStore((s) => s.localAvatarUri);
  const [sellerSheet, setSellerSheet] = useState(false);
  const [logoutSheet, setLogoutSheet] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const user = me.data;

  if (!user) {
    return (
      <Screen testID="profile-screen">
        {me.isError ? (
          <ErrorState
            testID="profile-error"
            variant={isOfflineError(me.error) ? 'offline' : 'error'}
            onRetry={() => me.refetch()}
            retrying={me.isRefetching}
          />
        ) : (
          <ProfileSkeleton />
        )}
      </Screen>
    );
  }

  const seller = isSeller(user);
  const needsEmail = !user.email || !user.emailVerified;

  return (
    <Screen scroll testID="profile-screen">
      <View className="items-center gap-2 pb-6 pt-8">
        <Avatar
          name={user.displayName ?? user.username ?? 'You'}
          uri={localAvatarUri ?? user.avatarUrl}
          size="xl"
          ring={seller}
        />
        <Text
          accessibilityRole="header"
          className="text-xl font-semibold text-text"
          testID="profile-name">
          {user.displayName ?? 'Your name'}
        </Text>
        {user.username ? <Text className="text-sm text-text-muted">@{user.username}</Text> : null}
        <View className="flex-row gap-2">
          {seller ? (
            <Badge label="Seller" variant="inverse" testID="profile-role-seller" />
          ) : (
            <Badge label="Buyer" testID="profile-role-buyer" />
          )}
        </View>
        {user.bio ? <Text className="text-center text-sm text-text">{user.bio}</Text> : null}
      </View>

      {me.isError ? (
        <Text className="pb-3 text-center text-xs text-text-subtle" testID="profile-stale">
          {isOfflineError(me.error)
            ? 'Offline — showing your saved profile.'
            : 'Couldn’t refresh your profile.'}
        </Text>
      ) : null}

      {needsEmail ? (
        <Card
          className="mb-4 bg-accent-muted"
          testID="profile-email-reminder"
          onPress={() => router.push('/account/email')}
          accessibilityLabel="Add and verify your email">
          <Text className="text-sm font-semibold text-text">
            {user.email ? 'Verify your email' : 'Add your email'}
          </Text>
          <Text className="text-sm text-text-muted">
            {user.email
              ? `We sent a link to ${user.email}. Verify it to secure your account.`
              : 'Get receipts and recover your account if you lose your phone.'}
          </Text>
        </Card>
      ) : null}

      <Card flush className="px-4">
        <ListItem
          icon="storefront-outline"
          title="Become a seller"
          subtitle={seller ? 'You’re a seller' : 'Open a store in one tap'}
          right={
            <Switch
              value={seller}
              disabled={seller}
              onValueChange={(on) => {
                if (on) setSellerSheet(true);
              }}
              trackColor={{ true: colors.primary, false: colors.borderStrong }}
              thumbColor={colors.surface}
              accessibilityLabel="Become a seller"
              testID="profile-seller-switch"
            />
          }
          testID="profile-seller-row"
        />
        <ListItem
          icon="create-outline"
          title="Edit profile"
          onPress={() => router.push('/account/edit-profile')}
          testID="profile-edit"
        />
        <ListItem
          icon="mail-outline"
          title="Email"
          subtitle={
            user.email ? `${user.email}${user.emailVerified ? '' : ' · not verified'}` : 'Not added'
          }
          onPress={() => router.push('/account/email')}
          testID="profile-email"
        />
        {user.phone ? (
          <ListItem icon="call-outline" title="Phone" subtitle={formatNigerianPhone(user.phone)} />
        ) : null}
        <ListItem
          icon="lock-closed-outline"
          title="App lock"
          onPress={() => router.push('/account/app-lock')}
          testID="profile-app-lock"
          last
        />
      </Card>

      <Card flush className="mt-4 px-4">
        <ListItem
          icon="download-outline"
          title="Export my data"
          onPress={() => router.push('/account/data-export')}
          testID="profile-export"
        />
        <ListItem
          icon="trash-outline"
          title="Delete account"
          onPress={() => router.push('/account/delete')}
          testID="profile-delete"
        />
        <ListItem
          icon="log-out-outline"
          title="Log out"
          onPress={() => setLogoutSheet(true)}
          testID="profile-logout"
          last
        />
      </Card>

      {__DEV__ ? (
        <Card flush className="mt-4 px-4">
          <ListItem
            icon="construct-outline"
            title="Components"
            subtitle="Developer gallery"
            onPress={() => router.push('/dev/components')}
            testID="profile-dev-components"
          />
          <ListItem
            icon="bug-outline"
            title="Dev settings"
            subtitle="Mock failures and session tools"
            onPress={() => router.push('/dev/settings')}
            testID="profile-dev-settings"
            last
          />
        </Card>
      ) : null}

      <BecomeSellerSheet visible={sellerSheet} onClose={() => setSellerSheet(false)} />

      <Sheet
        visible={logoutSheet}
        onClose={() => setLogoutSheet(false)}
        title="Log out?"
        testID="logout-sheet">
        <View className="gap-3">
          <Text className="text-sm text-text-muted">
            You’ll need a code sent to your phone or email to sign back in.
          </Text>
          <Button
            label="Log out"
            loading={loggingOut}
            onPress={async () => {
              setLoggingOut(true);
              await logout();
            }}
            testID="logout-confirm"
          />
          <Button label="Cancel" variant="ghost" onPress={() => setLogoutSheet(false)} />
        </View>
      </Sheet>
    </Screen>
  );
}
