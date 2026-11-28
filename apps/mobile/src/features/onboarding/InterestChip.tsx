import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text } from 'react-native';

import { cn } from '@/lib/cn';
import { useTheme } from '@/theme/ThemeProvider';

type InterestChipProps = {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
  testID?: string;
};

export function InterestChip({ label, selected, disabled, onPress, testID }: InterestChipProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, disabled }}
      className={cn(
        'min-h-10 flex-row items-center gap-1 rounded-full border px-4',
        selected ? 'border-primary bg-primary' : 'border-border-strong bg-surface',
        disabled && 'opacity-40',
      )}>
      {selected ? <Ionicons name="checkmark" size={16} color={colors.textInverse} /> : null}
      <Text className={cn('text-sm font-medium', selected ? 'text-text-inverse' : 'text-text')}>
        {label}
      </Text>
    </Pressable>
  );
}
