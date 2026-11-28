import { Stack } from 'expo-router';

export const unstable_settings = { initialRouteName: 'add-email' };

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="add-email" />
      <Stack.Screen name="username" />
      <Stack.Screen name="photo" />
      <Stack.Screen name="interests" />
    </Stack>
  );
}
