import { Image } from 'expo-image';
import { Text, View } from 'react-native';

import { cn } from '@/lib/cn';

import { ChromeGradient } from './internal/ChromeGradient';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

type AvatarProps = {
  /** Used for initials and the accessibility label */
  name: string;
  uri?: string | null;
  size?: AvatarSize;
  /** Metallic chrome ring, e.g. for verified sellers */
  ring?: boolean;
  className?: string;
  testID?: string;
};

const box: Record<AvatarSize, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-16 w-16',
  xl: 'h-24 w-24',
};

const initialsSize: Record<AvatarSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-xl',
  xl: 'text-3xl',
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase() || '?';
}

export function Avatar({ name, uri, size = 'md', ring = false, className, testID }: AvatarProps) {
  const face = uri ? (
    <Image
      source={{ uri }}
      className={cn('rounded-full bg-surface-muted', box[size])}
      contentFit="cover"
      transition={150}
      accessible={false}
    />
  ) : (
    <View className={cn('items-center justify-center rounded-full bg-primary', box[size])}>
      <Text className={cn('font-semibold text-text-inverse', initialsSize[size])}>
        {initials(name)}
      </Text>
    </View>
  );

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${name}'s profile picture`}
      className={cn(className)}>
      {ring ? (
        <ChromeGradient className="rounded-full p-0.5">
          <View className="rounded-full bg-bg p-0.5">{face}</View>
        </ChromeGradient>
      ) : (
        face
      )}
    </View>
  );
}
