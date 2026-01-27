import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Modal,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { AppHeader } from '@/components/AppHeader';
import { AnimatedButton } from '@/components/AnimatedButton';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ThemeColors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/theme-enhanced';
import { useLanguage } from '@/i18n';
import { useState as useReactState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRoute } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import { useAuth } from '@/contexts/ThemeContext';
import type { MaintenanceLog } from '@/types/vehicle';

export default function ServiceHistoryScreen() {
  const { vehicleId } = useLocalSearchParams<{ vehicleId?: string }>();
  const { theme } = useTheme();
  const colors = ThemeColors[theme];
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [serviceType, setServiceType] = useReactState('');
  const [mileage, setMileage] = useReactState('');
  const [cost, setCost] = useReactState('');
  const [description, setDescription] = useReactState('');
  const [serviceDate, setServiceDate] = useReactState(new Date().toISOString().split('T')[0]);
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigation = useNavigation();

  const fetchLogs = useCallback(async () => {
    if (!vehicleId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('maintenance_logs')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('service_date', { ascending: false });

      if (error) {
        console.error('[ServiceHistory] Error fetching logs:', error);
        return;
      }

      if (data) {
        setLogs(data as MaintenanceLog[]);
      }
    } catch (e) {
      console.error('[ServiceHistory] Unexpected error fetching logs:', e);
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useFocusEffect(
    useCallback(() => {
      fetchLogs();
    }, [fetchLogs])
  );

  const handleAddRecord = useCallback(async () => {
    if (!vehicleId || !user) {
      return;
    }

    const mileageValue = parseFloat(mileage);
    const costValue = cost ? parseFloat(cost) : undefined;

    try {
      const { error } = await supabase.from('maintenance_logs').insert({
        user_id: user.id,
        vehicle_id: vehicleId,
        service_type: serviceType,
        description: description || null,
        mileage_at_service: Number.isNaN(mileageValue) ? 0 : Math.round(mileageValue),
        cost: costValue,
        service_date: serviceDate,
      });

      if (error) {
        console.error('[ServiceHistory] Error adding maintenance log:', error);
        return;
      }

      setServiceType('');
      setMileage('');
      setCost('');
      setDescription('');
      setServiceDate(new Date().toISOString().split('T')[0]);
      setIsModalVisible(false);

      // Refresh logs after adding
      fetchLogs();
    } catch (e) {
      console.error('[ServiceHistory] Unexpected error adding maintenance log:', e);
    }
  }, [vehicleId, user, serviceType, mileage, cost, description, serviceDate, fetchLogs]);

  const renderItem = ({ item }: { item: MaintenanceLog }) => (
    <ThemedView style={[styles.card, { backgroundColor: colors.surface }, Shadows.sm]}>
      <View style={styles.cardHeader}>
        <ThemedText style={[styles.cardTitle, { color: textColor }]}>
          {item.service_type}
        </ThemedText>
        <ThemedText style={[styles.cardDate, { color: textSecondary }]}>
          {new Date(item.service_date).toLocaleDateString()}
        </ThemedText>
      </View>
      <ThemedText style={[styles.cardSubtitle, { color: textSecondary }]}>
        {item.mileage_at_service.toLocaleString()} km
        {item.cost != null ? ` • $${item.cost.toFixed(2)}` : ''}
      </ThemedText>
      {item.description ? (
        <ThemedText style={[styles.cardDescription, { color: textSecondary }]}>
          {item.description}
        </ThemedText>
      ) : null}
    </ThemedView>
  );

  return (
    <ThemedView style={styles.container}>
      <AppHeader title={t.maintenance?.title ?? 'Service History'} />
      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={logs.length === 0 ? styles.emptyContainer : styles.listContent}
        renderItem={renderItem}
        ListEmptyComponent={
          <ThemedView style={styles.emptyState}>
            <ThemedText style={[styles.emptyTitle, { color: textColor }]}>
              {t.maintenance?.noServices ?? 'No service records yet'}
            </ThemedText>
            <ThemedText style={[styles.emptySubtitle, { color: textSecondary }]}>
              {t.maintenance?.emptyMessage ?? 'Add your first service record to get started.'}
            </ThemedText>
          </ThemedView>
        }
        refreshing={loading}
        onRefresh={fetchLogs}
      />

      <AnimatedButton
        style={[styles.addButton, { backgroundColor: colors.primary }, Shadows.md]}
        onPress={() => setIsModalVisible(true)}
      >
        <IconSymbol name="plus" size={20} color="#FFFFFF" />
        <ThemedText style={styles.addButtonText}>
          {t.maintenance?.addService ?? 'Add Record'}
        </ThemedText>
      </AnimatedButton>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={[styles.modalContent, { backgroundColor: colors.surface }, Shadows.lg]}>
            <ThemedText style={[styles.modalTitle, { color: textColor }]}>
              {t.maintenance?.quickAdd ?? 'Add Service Record'}
            </ThemedText>

            <ThemedText style={[styles.label, { color: textColor }]}>{t.maintenance?.serviceType ?? 'Service Type'}</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: textColor }]}
              value={serviceType}
              onChangeText={setServiceType}
              placeholder="Oil Change"
              placeholderTextColor={textSecondary}
            />

            <ThemedText style={[styles.label, { color: textColor }]}>{t.maintenance?.miles ?? 'Mileage'}</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: textColor }]}
              value={mileage}
              onChangeText={setMileage}
              keyboardType="numeric"
              placeholder="80,000"
              placeholderTextColor={textSecondary}
            />

            <ThemedText style={[styles.label, { color: textColor }]}>{t.maintenance?.costLabel ?? 'Cost'}</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: textColor }]}
              value={cost}
              onChangeText={setCost}
              keyboardType="numeric"
              placeholder="$100"
              placeholderTextColor={textSecondary}
            />

            <ThemedText style={[styles.label, { color: textColor }]}>{t.maintenance?.serviceDateLabel ?? 'Service Date'}</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: textColor }]}
              value={serviceDate}
              onChangeText={setServiceDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={textSecondary}
            />

            <ThemedText style={[styles.label, { color: textColor }]}>{t.maintenance?.notesLabel ?? 'Notes'}</ThemedText>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.background, color: textColor }]}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              placeholder={t.maintenance?.emptyMessage ?? 'Add any additional details about this service'}
              placeholderTextColor={textSecondary}
            />

            <View style={styles.modalActions}>
              <AnimatedButton
                style={[styles.modalButton, { backgroundColor: colors.surface }]}
                onPress={() => setIsModalVisible(false)}
              >
                <ThemedText style={[styles.modalButtonText, { color: textSecondary }]}>
                  {t.common.cancel ?? 'Cancel'}
                </ThemedText>
              </AnimatedButton>
              <AnimatedButton
                style={[styles.modalButton, { backgroundColor: tintColor }]}
                onPress={handleAddRecord}
              >
                <ThemedText style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                  {t.maintenance?.addService ?? 'Save'}
                </ThemedText>
              </AnimatedButton>
            </View>
          </ThemedView>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
    paddingTop: Spacing.md,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
    opacity: 0.7,
  },
  card: {
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  cardTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
  },
  cardDate: {
    fontSize: Typography.fontSize.sm,
  },
  cardSubtitle: {
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.xs,
  },
  cardDescription: {
    fontSize: Typography.fontSize.sm,
  },
  addButton: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  addButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    padding: Spacing.lg,
  },
  modalTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '800',
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: Typography.fontSize.sm,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  input: {
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  textArea: {
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  modalButton: {
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  modalButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
  },
});

