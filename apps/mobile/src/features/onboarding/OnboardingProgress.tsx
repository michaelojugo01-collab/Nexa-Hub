import { Text } from 'react-native';

export function OnboardingProgress({ step, total }: { step: number; total: number }) {
  return (
    <Text
      className="pt-2 text-xs font-semibold uppercase text-text-subtle"
      testID="onboarding-step">
      Step {step} of {total}
    </Text>
  );
}
