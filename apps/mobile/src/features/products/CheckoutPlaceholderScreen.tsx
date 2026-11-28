import { router } from 'expo-router';

import { EmptyState, Screen } from '@/components';

/** Buy → here until checkout (F6) is built. */
export function CheckoutPlaceholderScreen() {
  return (
    <Screen testID="checkout-placeholder">
      <EmptyState
        className="flex-1"
        icon="card-outline"
        title="Checkout is coming soon"
        description="Paying in naira with card, bank transfer and USSD arrives in the next update."
        actionLabel="Back"
        onAction={() => router.back()}
      />
    </Screen>
  );
}
