import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { fetchRecalls, Recall } from '@/lib/recalls';

const BLUE = '#0567A6';
const RED = '#FF4444';
const GREEN = '#2ECC71';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function RecallsScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const params = useLocalSearchParams<{
    make?: string;
    model?: string;
    year?: string;
    vehicleName?: string;
  }>();

  const make = typeof params.make === 'string' ? params.make : '';
  const model = typeof params.model === 'string' ? params.model : '';
  const yearParam = typeof params.year === 'string' ? params.year : '';
  const year = parseInt(yearParam || '0', 10) || 0;
  const vehicleName =
    typeof params.vehicleName === 'string'
      ? params.vehicleName
      : [year, make?.trim(), model?.trim()].filter(Boolean).join(' ');

  const [loading, setLoading] = useState(true);
  const [recalls, setRecalls] = useState<Recall[]>([]);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadRecalls = useCallback(async () => {
    if (!make || !model || !year) {
      setRecalls([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const results = await fetchRecalls(make, model, year);
    setRecalls(results);
    setLastChecked(new Date());
    setLoading(false);
  }, [make, model, year]);

  useEffect(() => {
    loadRecalls();
  }, [loadRecalls]);

  const bg = isDark ? '#0D0D0D' : '#F2F2F7';
  const surface = isDark ? '#1A1A1A' : '#FFFFFF';
  const border = isDark ? '#2A2A2A' : '#E5E5EA';
  const textPrimary = isDark ? '#FFFFFF' : '#000000';
  const textSecondary = isDark ? '#CCCCCC' : '#555555';
  const muted = '#888888';

  const formatLastChecked = () => {
    const diff = Math.floor((Date.now() - lastChecked.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    return lastChecked.toLocaleDateString();
  };

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const openDealerLink = () => {
    Linking.openURL('https://www.nhtsa.gov/recalls');
  };

  const askWrenchy = (recall: Recall) => {
    const message = `Explain this recall for my ${vehicleName}: ${recall.Summary}`;
    router.push({
      pathname: '/(tabs)/chatbot',
      params: { initialMessage: message },
    });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10)).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    return dateStr;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Safety Recalls</Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <View style={styles.centerBlock}>
          <ActivityIndicator size="large" color={BLUE} />
          <Text style={[styles.loadingText, { color: muted }]}>Checking for recalls...</Text>
        </View>
      ) : recalls.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyScroll}>
          <View style={styles.emptyBlock}>
            <Ionicons name="checkmark-circle" size={80} color={GREEN} />
            <Text style={[styles.emptyTitle, { color: textPrimary }]}>No Active Recalls</Text>
            <Text style={[styles.emptySubtitle, { color: muted }]}>
              Your {vehicleName} has no open safety recalls.
            </Text>
            <Text style={[styles.lastChecked, { color: '#555555' }]}>Last checked: {formatLastChecked()}</Text>
            <TouchableOpacity
              style={[styles.checkAgainBtn, { backgroundColor: surface, borderColor: BLUE }]}
              onPress={loadRecalls}
              activeOpacity={0.85}
            >
              <Text style={styles.checkAgainText}>Check Again</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.warningBanner}>
            <Ionicons name="warning" size={20} color={RED} />
            <View style={styles.warningTextWrap}>
              <Text style={styles.warningTitle}>
                {recalls.length} Active Recall{recalls.length > 1 ? 's' : ''} Found
              </Text>
              <Text style={[styles.warningSubtext, { color: muted }]}>
                Contact your dealer immediately to schedule free repairs.
              </Text>
            </View>
          </View>

          {recalls.map((recall) => {
            const isExpanded = expandedId === recall.NHTSACampaignNumber;
            return (
              <TouchableOpacity
                key={recall.NHTSACampaignNumber}
                activeOpacity={0.9}
                onPress={() => toggleExpand(recall.NHTSACampaignNumber)}
                style={[
                  styles.recallCard,
                  {
                    backgroundColor: surface,
                    borderColor: border,
                    borderLeftWidth: 3,
                    borderLeftColor: recall.ParkIt ? RED : BLUE,
                  },
                ]}
              >
                <View style={styles.cardInner}>
                  <View style={styles.cardTopRow}>
                    <Text style={[styles.componentText, { color: textPrimary }]} numberOfLines={2}>
                      {recall.Component}
                    </Text>
                    <Text style={[styles.dateText, { color: muted }]}>{formatDate(recall.ReportReceivedDate)}</Text>
                  </View>
                  {recall.ParkIt && (
                    <View style={styles.parkItPill}>
                      <Text style={styles.parkItText}>DO NOT DRIVE</Text>
                    </View>
                  )}

                  {isExpanded && (
                    <>
                      <View style={styles.section}>
                        <Text style={[styles.sectionLabel, { color: muted }]}>What happened:</Text>
                        <Text style={[styles.sectionBody, { color: textSecondary }]}>{recall.Summary}</Text>
                      </View>
                      <View style={styles.section}>
                        <Text style={[styles.sectionLabel, { color: muted }]}>Risk:</Text>
                        <Text style={[styles.sectionBody, { color: textSecondary }]}>{recall.Consequence}</Text>
                      </View>
                      <View style={styles.section}>
                        <Text style={[styles.sectionLabel, { color: muted }]}>Fix:</Text>
                        <Text style={[styles.remedyText, { color: GREEN }]}>{recall.Remedy}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.wrenchyBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          askWrenchy(recall);
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="chatbubble-ellipses-outline" size={18} color={BLUE} />
                        <Text style={styles.wrenchyBtnText}>Ask Wrenchy About This</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {!isExpanded && (
                    <View style={styles.expandHint}>
                      <Ionicons name="chevron-down" size={18} color={muted} />
                      <Text style={[styles.expandHintText, { color: muted }]}>Tap to expand</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity style={styles.dealerBtn} onPress={openDealerLink} activeOpacity={0.85}>
            <Text style={styles.dealerBtnText}>Find a Dealer Near You</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '700',
  },
  headerRight: {
    width: 32,
  },
  centerBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyBlock: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '700',
    marginTop: 24,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
  },
  lastChecked: {
    fontSize: 13,
    marginTop: 8,
  },
  checkAgainBtn: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
  checkAgainText: {
    color: BLUE,
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,68,68,0.12)',
    borderWidth: 1,
    borderColor: RED,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  warningTextWrap: {
    flex: 1,
  },
  warningTitle: {
    color: RED,
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '700',
  },
  warningSubtext: {
    fontSize: 13,
    marginTop: 4,
  },
  recallCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardInner: {},
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  componentText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
  },
  parkItPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,68,68,0.15)',
    borderWidth: 1,
    borderColor: RED,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
  },
  parkItText: {
    color: RED,
    fontSize: 11,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '700',
  },
  section: {
    marginTop: 12,
  },
  sectionLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  remedyText: {
    fontSize: 14,
    lineHeight: 20,
    color: GREEN,
  },
  wrenchyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingVertical: 10,
  },
  wrenchyBtnText: {
    color: BLUE,
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    fontWeight: '600',
  },
  expandHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  expandHintText: {
    fontSize: 12,
  },
  dealerBtn: {
    backgroundColor: RED,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  dealerBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    fontWeight: '600',
  },
});
