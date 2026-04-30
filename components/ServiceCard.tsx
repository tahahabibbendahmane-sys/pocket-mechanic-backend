import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ServiceCard({ title, status, color, lastService, icon, onPress }: any) {
  return (
    <TouchableOpacity 
      style={[styles.card, { borderColor: color + '40' }]} 
      onPress={onPress} 
      activeOpacity={0.7}
    >
      <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <View style={[styles.badge, { backgroundColor: color + '20' }]}>
            <Text style={[styles.statusText, { color: color }]}>{status}</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>{lastService}</Text>
        <View style={styles.progressTrack}>
            <View style={[styles.progressBar, { backgroundColor: color, width: status === 'Good' ? '80%' : status === 'Due Soon' ? '40%' : '10%' }]} />
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#151515', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1 },
  iconBox: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  content: { flex: 1, marginRight: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  subtitle: { color: '#888', fontSize: 12, marginBottom: 8 },
  progressTrack: { height: 4, backgroundColor: '#333', borderRadius: 2, width: '100%' },
  progressBar: { height: '100%', borderRadius: 2 }
});
