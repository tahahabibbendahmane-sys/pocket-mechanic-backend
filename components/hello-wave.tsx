import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/DesignSystem';

export function HelloWave() {
  return (
    <View style={{ marginTop: -6 }}>
      <Ionicons name="hand-left-outline" size={28} color={COLORS.primary} />
    </View>
  );
}
