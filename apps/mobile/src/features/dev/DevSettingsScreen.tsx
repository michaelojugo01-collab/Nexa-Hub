import { Redirect } from 'expo-router';
import { Platform, Switch, Text, View } from 'react-native';

import { Button, Card, ListItem, Screen } from '@/components';
import { mockServer } from '@/lib/api/client';
import { refreshMe } from '@/lib/auth/session';
import { signOutLocally } from '@/lib/auth/sign-out';
import { config } from '@/lib/config';
import { formatNigerianPhone } from '@/lib/phone';
import { fixtureUsers, MOCK_OTP_CODE } from '@/mocks/fixtures';
import { useMockControl } from '@/mocks/mock-control';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from '@/stores/toast-store';
import { useTheme } from '@/theme/ThemeProvider';

import SmsRetriever from '../../../modules/sms-retriever';

function Toggle({
  title,
  subtitle,
  value,
  onChange,
  testID,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
  testID: string;
}) {
  const { colors } = useTheme();
  return (
    <ListItem
      title={title}
      subtitle={subtitle}
      right={
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{ true: colors.primary, false: colors.borderStrong }}
          thumbColor={colors.surface}
          accessibilityLabel={title}
          testID={testID}
        />
      }
    />
  );
}

/** Dev-only tools for exercising F1 states against the mock backend. */
export function DevSettingsScreen() {
  const control = useMockControl();
  const user = useAuthStore((s) => s.user);
  if (!__DEV__) return <Redirect href="/" />;

  /** Swap in a token that the mock server sees as expired: the next request must refresh. */
  const expireAccessToken = async () => {
    if (!user) return;
    useAuthStore.setState({ accessToken: `at.${user.id}.0.expired` });
    const me = await refreshMe();
    toast.show(
      me ? 'Token expired → refreshed silently' : 'Refresh failed → signed out',
      me ? 'success' : 'error',
    );
  };

  return (
    <Screen scroll edges={[]} testID="dev-settings">
      <View className="gap-4 pt-4">
        <Text className="text-sm text-text-muted">
          Mocks: {config.useMocks ? 'on' : 'off'} · Code: {MOCK_OTP_CODE} · Access token TTL:{' '}
          {config.mockAccessTokenTtlSec}s · Lock after: {config.appLockAfterSec}s · Delay:{' '}
          {config.mockDelayMs}ms
        </Text>

        <Card flush className="px-4">
          <Toggle
            title="SMS down"
            subtitle="SMS codes fail with SMS_UNAVAILABLE"
            value={control.smsDown}
            onChange={(v) => control.set({ smsDown: v })}
            testID="dev-sms-down"
          />
          <Toggle
            title="Rate limited"
            subtitle="Code requests and checks return RATE_LIMITED"
            value={control.rateLimited}
            onChange={(v) => control.set({ rateLimited: v })}
            testID="dev-rate-limited"
          />
          <Toggle
            title="Network offline"
            subtitle="Every mocked request fails like no connection"
            value={control.offline}
            onChange={(v) => control.set({ offline: v })}
            testID="dev-offline"
          />
        </Card>

        <Card>
          <Text className="pb-2 text-sm font-semibold text-text">Returning accounts</Text>
          {fixtureUsers.map((u) => (
            <Text key={u.id} className="text-sm text-text-muted">
              {u.phone ? formatNigerianPhone(u.phone) : u.email} — @{u.username} (
              {u.roles.join(', ')})
            </Text>
          ))}
          <Text className="pt-2 text-xs text-text-subtle">
            Any other number creates a new user.
          </Text>
        </Card>

        {user ? (
          <Button
            label="Expire access token now"
            variant="secondary"
            onPress={expireAccessToken}
            testID="dev-expire-token"
          />
        ) : null}
        <Button
          label="Reset mock database"
          variant="secondary"
          onPress={async () => {
            await mockServer?.reset();
            await signOutLocally(null);
            toast.show('Mock database reset', 'success');
          }}
          testID="dev-reset"
        />

        {Platform.OS === 'android' ? (
          <Text className="text-xs text-text-subtle">
            SMS Retriever app hash:{' '}
            {SmsRetriever
              ? (SmsRetriever.getAppHash() ?? 'unavailable')
              : 'needs a development build'}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}
