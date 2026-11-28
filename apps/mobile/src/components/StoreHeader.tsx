import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Text, View } from 'react-native';

import { cn } from '@/lib/cn';
import { useTheme } from '@/theme/ThemeProvider';

import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { Button } from './Button';
import { ChromeGradient } from './internal/ChromeGradient';

type StoreHeaderProps = {
  name: string;
  /** Shown as nexahub.ng/{slug}-style handle */
  slug: string;
  location?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  followerCount: number;
  productCount: number;
  verified?: boolean;
  /** Follow state comes from the server; this component only displays it. */
  following?: boolean;
  onFollowPress?: () => void;
  followLoading?: boolean;
  className?: string;
  testID?: string;
};

function compact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

export function StoreHeader({
  name,
  slug,
  location,
  bio,
  avatarUrl,
  coverUrl,
  followerCount,
  productCount,
  verified = false,
  following = false,
  onFollowPress,
  followLoading = false,
  className,
  testID,
}: StoreHeaderProps) {
  const { colors } = useTheme();

  return (
    <View testID={testID} className={cn('bg-bg', className)}>
      {coverUrl ? (
        <Image
          source={{ uri: coverUrl }}
          contentFit="cover"
          accessible={false}
          className="h-32 w-full bg-surface-muted"
        />
      ) : (
        <ChromeGradient className="h-32 w-full" />
      )}

      <View className="-mt-10 gap-3 px-4">
        <View className="flex-row items-end justify-between">
          <Avatar name={name} uri={avatarUrl} size="xl" ring={verified} />
          {onFollowPress ? (
            <Button
              label={following ? 'Following' : 'Follow'}
              variant={following ? 'secondary' : 'primary'}
              size="sm"
              loading={followLoading}
              onPress={onFollowPress}
              accessibilityLabel={following ? `Unfollow ${name}` : `Follow ${name}`}
              testID={testID ? `${testID}-follow` : undefined}
            />
          ) : null}
        </View>

        <View className="gap-1">
          <View className="flex-row items-center gap-2">
            <Text accessibilityRole="header" className="text-2xl font-bold text-text">
              {name}
            </Text>
            {verified ? <Badge label="Verified" variant="chrome" /> : null}
          </View>
          <Text className="text-sm text-text-muted">@{slug}</Text>
        </View>

        {location ? (
          <View className="flex-row items-center gap-1">
            <Ionicons
              name="location-outline"
              size={14}
              color={colors.textMuted}
              accessible={false}
            />
            <Text className="text-sm text-text-muted">{location}</Text>
          </View>
        ) : null}

        {bio ? <Text className="text-sm text-text">{bio}</Text> : null}

        <View
          className="flex-row gap-4"
          accessible
          accessibilityLabel={`${followerCount} followers, ${productCount} products`}>
          <Text className="text-sm text-text-muted">
            <Text className="font-semibold text-text">{compact(followerCount)}</Text> followers
          </Text>
          <Text className="text-sm text-text-muted">
            <Text className="font-semibold text-text">{compact(productCount)}</Text> products
          </Text>
        </View>
      </View>
    </View>
  );
}
