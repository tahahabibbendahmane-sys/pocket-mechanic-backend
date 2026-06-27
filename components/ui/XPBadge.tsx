import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface XPBadgeProps {
  xp: number;
}

export function XPBadge({ xp }: XPBadgeProps) {
  return (
    <View style={styles.badge}>
      <Ionicons name="flash" size={13} color="#1A6FBF" />
      <Text style={styles.text}>{xp.toLocaleString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EBF3FC',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: {
    fontSize: 13,
    color: '#1A6FBF',
  },
});
