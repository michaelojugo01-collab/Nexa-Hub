import { Stack } from 'expo-router';

export default function SellerLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, headerBackTitle: 'Back' }}>
      <Stack.Screen name="setup" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="published" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="edit" options={{ title: 'Edit store' }} />
      <Stack.Screen name="payouts" options={{ title: 'Bank account' }} />
      <Stack.Screen name="products/new" options={{ title: 'Add product' }} />
      <Stack.Screen name="products/[id]/index" options={{ headerShown: false }} />
      <Stack.Screen
        name="products/[id]/published"
        options={{ headerShown: false, gestureEnabled: false }}
      />
    </Stack>
  );
}
