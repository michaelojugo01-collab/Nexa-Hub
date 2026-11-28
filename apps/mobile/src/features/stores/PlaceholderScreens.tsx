import { router } from 'expo-router';

import { EmptyState, Screen } from '@/components';

/** Payouts are module F7. */
export function PayoutsPlaceholderScreen() {
  return (
    <Screen testID="payouts-placeholder">
      <EmptyState
        className="flex-1"
        icon="card-outline"
        title="Bank accounts are coming soon"
        description="You’ll add your bank account here to receive your earnings. Keep selling: nothing you earn is lost."
        actionLabel="Back"
        onAction={() => router.back()}
      />
    </Screen>
  );
}
