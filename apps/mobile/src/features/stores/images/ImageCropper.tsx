import { Image } from 'expo-image';
import { Modal, Pressable, Text, useWindowDimensions, View } from 'react-native';
import {
  GestureDetector,
  GestureHandlerRootView,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
} from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components';
import { ThemeScope } from '@/theme/ThemeProvider';

import {
  clampOffset,
  clampZoom,
  coverScale,
  cropRect,
  maxOffset,
  type CropRect,
  type Size,
} from './crop-math';

type ImageCropperProps = {
  visible: boolean;
  image: { uri: string } & Size;
  /** width / height: 1 for the avatar, 3 for the banner */
  aspect: number;
  title: string;
  onCancel: () => void;
  onDone: (rect: CropRect) => void;
  testID?: string;
};

const SIDE_GUTTER = 16;

/**
 * Our own crop screen (same on iOS and Android, works in Expo Go): pinch to zoom, drag to
 * move, inside a fixed frame. Only the crop rectangle leaves this screen; the pixels are
 * cut by expo-image-manipulator.
 */
export function ImageCropper({
  visible,
  image,
  aspect,
  title,
  onCancel,
  onDone,
  testID = 'image-cropper',
}: ImageCropperProps) {
  const { width: screenWidth } = useWindowDimensions();
  const frameWidth = screenWidth - SIDE_GUTTER * 2;
  const frame = { width: frameWidth, height: frameWidth / aspect };
  const base = coverScale(image, frame);
  const imageSize = { width: image.width * base, height: image.height * base };

  const zoom = useSharedValue(1);
  const startZoom = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const pinch = usePinchGesture({
    runOnJS: false,
    onBegin: () => {
      'worklet';
      startZoom.value = zoom.value;
    },
    onUpdate: (e) => {
      'worklet';
      zoom.value = clampZoom(startZoom.value * e.scale);
      const max = maxOffset(image, frame, zoom.value);
      tx.value = clampOffset(tx.value, max.x);
      ty.value = clampOffset(ty.value, max.y);
    },
  });
  const pan = usePanGesture({
    runOnJS: false,
    onBegin: () => {
      'worklet';
      startX.value = tx.value;
      startY.value = ty.value;
    },
    onUpdate: (e) => {
      'worklet';
      const max = maxOffset(image, frame, zoom.value);
      tx.value = clampOffset(startX.value + e.translationX, max.x);
      ty.value = clampOffset(startY.value + e.translationY, max.y);
    },
  });
  const gesture = useSimultaneousGestures(pinch, pan);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: zoom.value }],
  }));

  function done() {
    // Shared values are readable on the JS thread once gestures have settled.
    onDone(cropRect(image, frame, zoom.get(), tx.get(), ty.get()));
  }

  function reset() {
    zoom.set(1);
    tx.set(0);
    ty.set(0);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <ThemeScope>
        <GestureHandlerRootView className="flex-1">
          <SafeAreaView className="flex-1 bg-primary" testID={testID}>
            <View className="flex-row items-center justify-between px-4 py-3">
              <HeaderAction label="Cancel" onPress={onCancel} testID={`${testID}-cancel`} />
              <Text
                accessibilityRole="header"
                className="text-base font-semibold text-text-inverse">
                {title}
              </Text>
              <HeaderAction label="Reset" onPress={reset} testID={`${testID}-reset`} />
            </View>

            <View className="flex-1 items-center justify-center">
              <GestureDetector gesture={gesture}>
                <View
                  className="items-center justify-center overflow-hidden rounded-md border border-accent"
                  style={frame}
                  accessible
                  accessibilityLabel="Crop area. Pinch to zoom and drag to move the photo."
                  testID={`${testID}-frame`}>
                  <Animated.View style={[imageSize, imageStyle]}>
                    <Image
                      source={{ uri: image.uri }}
                      contentFit="cover"
                      accessible={false}
                      className="h-full w-full"
                    />
                  </Animated.View>
                </View>
              </GestureDetector>
              <Text className="mt-4 text-sm text-text-subtle">Pinch to zoom · drag to move</Text>
            </View>

            <View className="px-4 pb-4">
              <Button
                label="Use photo"
                onPress={done}
                fullWidth
                variant="secondary"
                testID={`${testID}-done`}
              />
            </View>
          </SafeAreaView>
        </GestureHandlerRootView>
      </ThemeScope>
    </Modal>
  );
}

function HeaderAction({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      hitSlop={8}
      className="justify-center px-2 py-2"
      testID={testID}>
      <Text className="text-base font-medium text-text-inverse">{label}</Text>
    </Pressable>
  );
}
