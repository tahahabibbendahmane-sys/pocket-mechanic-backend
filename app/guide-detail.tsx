import React, { useState, useMemo } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, ScrollView, StatusBar, Share, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';
import { COLORS } from '@/constants/DesignSystem';
import { hardcodedGuides, Guide } from '@/data/guides';

const BLUE = COLORS.blue;
const GREEN = '#2ECC71';
const RED = '#FF4444';

function getDifficultyColor(d: Guide['difficulty']): string {
  if (d === 'Easy') return GREEN;
  if (d === 'Moderate') return BLUE;
  return '#FF3B30';
}

function parseGuideParam(raw: string | undefined): Guide | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.title && Array.isArray(parsed?.steps)) {
      // Normalize AI-generated guides which may use "number" instead of "stepNumber"
      const normalizedSteps = parsed.steps.map((s: any, index: number) => ({
        stepNumber: typeof s.stepNumber === 'number' ? s.stepNumber : typeof s.number === 'number' ? s.number : index + 1,
        title: s.title,
        description: s.description,
        warning: s.warning,
      }));

      const guide: Guide = {
        id: parsed.id ?? 'ai-guide',
        title: parsed.title,
        difficulty: parsed.difficulty ?? 'Moderate',
        estimatedTime: parsed.estimatedTime ?? '',
        estimatedSavings: parsed.estimatedSavings ?? '',
        toolsNeeded: parsed.toolsNeeded ?? [],
        partsNeeded: parsed.partsNeeded ?? [],
        steps: normalizedSteps,
        warnings: parsed.warnings ?? [],
      };

      return guide;
    }
  } catch {}
  return null;
}

export default function GuideDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { id, guideData } = useLocalSearchParams<{ id: string; guideData?: string }>();

  const guide = hardcodedGuides.find(g => g.id === id) ?? parseGuideParam(guideData);

  const bg = COLORS.surface;
  const surface = COLORS.card;
  const border = COLORS.border;
  const textPrimary = COLORS.text;
  const textMuted = COLORS.textMuted;

  const [completed, setCompleted] = useState<Set<number>>(new Set());

  const totalSteps = guide?.steps.length ?? 0;
  const completedCount = completed.size;
  const allDone = totalSteps > 0 && completedCount === totalSteps;
  const progress = totalSteps > 0 ? completedCount / totalSteps : 0;

  const toggleStep = (stepNumber: number) => {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(stepNumber)) next.delete(stepNumber);
      else next.add(stepNumber);
      return next;
    });
  };

  const handleShare = async () => {
    if (!guide) return;
    try {
      await Share.share({
        message: `DIY Guide: ${guide.title}\n${guide.steps.length} steps · ${guide.estimatedTime} · Save ${guide.estimatedSavings}\n\nSent from Pocket Mechanic`,
      });
    } catch (_) {}
  };

  if (!guide) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
        <View style={styles.notFound}>
          <Text style={{ color: textMuted, fontSize: 16 }}>{t.guideDetail.notFound}</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: BLUE, fontSize: 15, fontWeight: '600' }}>{t.guideDetail.goBack}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const diffColor = getDifficultyColor(guide.difficulty);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle="dark-content" backgroundColor={bg} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: bg, paddingTop: Platform.OS === 'ios' ? insets.top + 4 : 16 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={BLUE} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textPrimary }]} numberOfLines={1}>{guide.title}</Text>
        <TouchableOpacity onPress={handleShare} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="share-outline" size={22} color={textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Hero card */}
        <View style={[styles.heroCard, { backgroundColor: surface, borderColor: border }]}>
          <Text style={[styles.heroTitle, { color: textPrimary }]}>{guide.title}</Text>
          <View style={styles.heroBadges}>
            <View style={[styles.badge, { backgroundColor: diffColor + '18' }]}>
              <Text style={[styles.badgeText, { color: diffColor }]}>{guide.difficulty}</Text>
            </View>
            <View style={styles.heroMeta}>
              <Ionicons name="time-outline" size={14} color={textMuted} />
              <Text style={[styles.heroMetaText, { color: textMuted }]}>{guide.estimatedTime}</Text>
            </View>
            <View style={styles.heroMeta}>
              <Text style={{ color: GREEN, fontSize: 13, fontWeight: '700' }}>$</Text>
              <Text style={[styles.heroMetaText, { color: GREEN }]}>Save {guide.estimatedSavings}</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: border }]} />

          <View style={styles.toolsPartsRow}>
            {/* Tools */}
            <View style={styles.toolsCol}>
              <View style={styles.colHeader}>
                <Ionicons name="build-outline" size={16} color={BLUE} />
                <Text style={[styles.colTitle, { color: textPrimary }]}>{t.guideDetail.toolsNeeded}</Text>
              </View>
              {(guide.toolsNeeded ?? []).length > 0 ? guide.toolsNeeded.map((tool, i) => (
                <Text key={i} style={[styles.listItem, { color: textMuted }]}>•  {tool}</Text>
              )) : (
                <Text style={[styles.listItem, { color: textMuted }]}>{t.guideDetail.noneRequired}</Text>
              )}
            </View>

            {/* Parts */}
            <View style={styles.partsCol}>
              <View style={styles.colHeader}>
                <Ionicons name="cube-outline" size={16} color={BLUE} />
                <Text style={[styles.colTitle, { color: textPrimary }]}>{t.guideDetail.partsNeeded}</Text>
              </View>
              {(guide.partsNeeded ?? []).length > 0 ? guide.partsNeeded.map((part, i) => (
                <Text key={i} style={[styles.listItem, { color: textMuted }]}>•  {part}</Text>
              )) : (
                <Text style={[styles.listItem, { color: textMuted }]}>{t.guideDetail.noneRequired}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressWrap}>
          <View style={[styles.progressTrack, { backgroundColor: border }]}>
            <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: allDone ? GREEN : BLUE }]} />
          </View>
          <Text style={[styles.progressLabel, { color: textMuted }]}>
            {completedCount} / {totalSteps} {t.guideDetail.stepsComplete}
          </Text>
        </View>

        {/* Safety warnings */}
        {(guide.warnings ?? []).length > 0 && (
          <View style={styles.warningCard}>
            <View style={styles.warningHeader}>
              <Ionicons name="warning" size={18} color={RED} />
              <Text style={styles.warningTitle}>{t.guideDetail.safetyFirst}</Text>
            </View>
            {(guide.warnings ?? []).map((w, i) => (
              <View key={i} style={styles.warningRow}>
                <View style={styles.warningDot} />
                <Text style={styles.warningText}>{w}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Steps */}
        <Text style={[styles.sectionTitle, { color: textPrimary }]}>{t.guideDetail.stepByStepGuide}</Text>

        {guide.steps.map(step => {
          const done = completed.has(step.stepNumber);
          return (
            <TouchableOpacity
              key={step.stepNumber}
              style={[
                styles.stepCard,
                { backgroundColor: surface, borderColor: border },
                done && styles.stepCardDone,
              ]}
              activeOpacity={0.7}
              onPress={() => toggleStep(step.stepNumber)}
            >
              <View style={styles.stepRow}>
                <View style={[styles.stepCircle, done && styles.stepCircleDone]}>
                  {done ? (
                    <Ionicons name="checkmark" size={18} color={COLORS.text} />
                  ) : (
                    <Text style={styles.stepNum}>{step.stepNumber}</Text>
                  )}
                </View>
                <View style={styles.stepBody}>
                  <Text style={[styles.stepTitle, { color: textPrimary }, done && styles.stepTitleDone]}>{step.title}</Text>
                  <Text style={[styles.stepDesc, { color: textMuted }]}>{step.description}</Text>
                  {step.warning && (
                    <View style={styles.stepWarning}>
                      <Ionicons name="alert-circle" size={14} color={BLUE} />
                      <Text style={styles.stepWarningText}>{step.warning}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Bottom spacer for sticky footer */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Sticky footer */}
      <View style={[styles.footer, { backgroundColor: bg, borderTopColor: border, paddingBottom: Math.max(insets.bottom, 16) }]}>
        {allDone ? (
          <TouchableOpacity style={styles.completeBtn} activeOpacity={0.8} onPress={() => router.back()}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.text} />
            <Text style={styles.completeBtnText}>{t.guideDetail.markComplete}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.remainingText, { color: textMuted }]}>
            {totalSteps - completedCount} {t.guideDetail.step}{totalSteps - completedCount !== 1 ? 's' : ''} {t.guideDetail.remaining}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notFound: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center' },

  /* Scroll */
  scrollContent: { paddingHorizontal: 24, paddingTop: 8 },

  /* Hero */
  heroCard: { borderWidth: 1, borderRadius: 16, padding: 20, marginBottom: 16 },
  heroTitle: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  heroBadges: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroMetaText: { fontSize: 13 },
  divider: { height: 1, marginBottom: 16 },
  toolsPartsRow: { flexDirection: 'row', gap: 16 },
  toolsCol: { flex: 1 },
  partsCol: { flex: 1 },
  colHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  colTitle: { fontSize: 14, fontWeight: '600' },
  listItem: { fontSize: 13, lineHeight: 22 },

  /* Progress */
  progressWrap: { marginBottom: 16, gap: 6 },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  progressLabel: { fontSize: 12, textAlign: 'right' },

  /* Safety warnings */
  warningCard: {
    backgroundColor: 'rgba(255,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 10,
  },
  warningHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  warningTitle: { color: RED, fontSize: 15, fontWeight: '700' },
  warningRow: { flexDirection: 'row', gap: 8, paddingLeft: 4 },
  warningDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: RED, marginTop: 6 },
  warningText: { flex: 1, color: '#CC3333', fontSize: 13, lineHeight: 20 },

  /* Steps */
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 14 },
  stepCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 1,
  },
  stepCardDone: {
    borderLeftWidth: 3,
    borderLeftColor: GREEN,
  },
  stepRow: { flexDirection: 'row', gap: 14 },
  stepCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: BLUE,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 2,
  },
  stepCircleDone: { backgroundColor: GREEN },
  stepNum: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  stepBody: { flex: 1, gap: 6 },
  stepTitle: { fontSize: 15, fontWeight: '600' },
  stepTitleDone: { textDecorationLine: 'line-through', opacity: 0.6 },
  stepDesc: { fontSize: 14, lineHeight: 21 },
  stepWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(245,166,35,0.08)',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  stepWarningText: { flex: 1, color: BLUE, fontSize: 12, lineHeight: 18 },

  /* Footer */
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    alignItems: 'center',
  },
  completeBtn: {
    flexDirection: 'row',
    backgroundColor: GREEN,
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    gap: 8,
  },
  completeBtnText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  remainingText: { fontSize: 14 },
});
