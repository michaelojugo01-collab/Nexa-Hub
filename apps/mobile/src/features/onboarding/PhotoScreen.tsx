import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Avatar, Button } from '@/components';
import { useAuthStore } from '@/stores/auth-store';

import { AuthHeader } from '../auth/AuthHeader';
import { AuthScreen } from '../auth/AuthScreen';
import { InlineNotice } from '../auth/InlineNotice';
import { pickAvatar } from '../profile/pick-avatar';
import { OnboardingProgress } from './OnboardingProgress';

/** Optional profile photo. Kept on this device for now; uploading comes with media uploads. */
export function PhotoScreen() {
  const user = useAuthStore((s) => s.user);
  const localAvatarUri = useAuthStore((s) => s.localAvatarUri);
  const setLocalAvatarUri = useAuthStore((s) => s.setLocalAvatarUri);
  const [failed, setFailed] = useState(false);

  const choose = async () => {
    setFailed(false);
    try {
      const uri = await pickAvatar();
      if (uri) await setLocalAvatarUri(uri);
    } catch {
      setFailed(true);
    }
  };

  return (
    <AuthScreen
      testID="photo-screen"
      footer={
        <>
          <Button
            label={localAvatarUri ? 'Continue' : 'Choose a photo'}
            onPress={localAvatarUri ? () => router.push('/interests') : choose}
            testID="photo-primary"
          />
          <Button
            label={localAvatarUri ? 'Change photo' : 'Skip for now'}
            variant="ghost"
            onPress={localAvatarUri ? choose : () => router.push('/interests')}
            testID="photo-secondary"
          />
        </>
      }>
      <OnboardingProgress step={3} total={4} />
      <AuthHeader title="Add a photo" subtitle="Optional. A face or logo helps people trust you." />
      <View className="items-center gap-3 pt-6">
        <Avatar
          name={user?.displayName ?? user?.username ?? 'You'}
          uri={localAvatarUri}
          size="xl"
          ring
        />
        {localAvatarUri ? <Text className="text-sm text-text-muted">Looking good.</Text> : null}
        {failed ? (
          <InlineNotice tone="error" message="We couldn’t open your photos. Please try again." />
        ) : null}
      </View>
    </AuthScreen>
  );
}
