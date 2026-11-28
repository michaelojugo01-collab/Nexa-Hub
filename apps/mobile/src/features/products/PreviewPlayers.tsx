import Ionicons from '@expo/vector-icons/Ionicons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { formatDuration } from './product-ui';

/** Sample pages as images (PDF types). Real PDF rendering is F5. */
export function PreviewPages({
  pages,
  testID = 'preview-pages',
}: {
  pages: string[];
  testID?: string;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-3"
      accessibilityLabel={`${pages.length} sample pages`}
      testID={testID}>
      {pages.map((uri, i) => (
        <Image
          key={uri}
          source={{ uri }}
          contentFit="cover"
          accessibilityLabel={`Sample page ${i + 1}`}
          className="h-40 w-32 rounded-md border border-border bg-surface-muted"
        />
      ))}
    </ScrollView>
  );
}

/** A short video clip, with native controls. */
export function PreviewVideo({ uri, testID = 'preview-video' }: { uri: string; testID?: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  return (
    <View className="aspect-video w-full overflow-hidden rounded-lg bg-primary" testID={testID}>
      <VideoView
        player={player}
        nativeControls
        contentFit="contain"
        allowsPictureInPicture={false}
        style={{ width: '100%', height: '100%' }}
        accessibilityLabel="Preview video"
      />
    </View>
  );
}

/** A short audio clip with play/pause. */
export function PreviewAudio({ uri, testID = 'preview-audio' }: { uri: string; testID?: string }) {
  const { colors } = useTheme();
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const playing = status.playing;
  return (
    <View
      className="flex-row items-center gap-3 rounded-lg border border-border bg-surface p-3"
      testID={testID}>
      <Pressable
        onPress={() => (playing ? player.pause() : player.play())}
        accessibilityRole="button"
        accessibilityLabel={playing ? 'Pause preview' : 'Play preview'}
        className="h-12 w-12 items-center justify-center rounded-full bg-primary"
        testID={`${testID}-toggle`}>
        <Ionicons name={playing ? 'pause' : 'play'} size={22} color={colors.textInverse} />
      </Pressable>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-text">Listen to a preview</Text>
        <Text className="text-xs text-text-muted">
          {formatDuration(Math.floor(status.currentTime ?? 0))}
          {status.duration ? ` / ${formatDuration(Math.floor(status.duration))}` : ''}
        </Text>
      </View>
    </View>
  );
}
