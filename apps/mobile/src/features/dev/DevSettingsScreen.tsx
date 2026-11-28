import { Redirect } from 'expo-router';
import { Text } from 'react-native';

import { Screen } from '@/components';

/** Filled in by the Dev settings step. */
export function DevSettingsScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <Screen scroll edges={[]}>
      <Text className="pt-4 text-text">Coming next.</Text>
    </Screen>
  );
}
