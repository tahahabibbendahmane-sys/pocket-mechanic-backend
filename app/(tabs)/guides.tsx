import React, { useState, useMemo, useRef } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, StatusBar, ActivityIndicator, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useActiveCar } from '@/contexts/ActiveCarContext';
import { COLORS, SPACING, RADIUS, TYPE, getColors } from '@/constants/DesignSystem';
import { ChunkyCard } from '@/components/ui/ChunkyCard';
import { ChunkyButton } from '@/components/ui/ChunkyButton';
import { XP_REWARDS } from '@/lib/xpSystem';
import { isElectricVehicle } from '@/lib/evDetection';

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

interface Guide {
  id: string;
  title: string;
  category: string;
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  timeMin: number;
  timeMax: number;
  costMin: number;
  costMax: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const GUIDES: Guide[] = [
  { id: 'oil', title: 'How to Change Your Oil', category: 'Engine', difficulty: 'Easy', timeMin: 30, timeMax: 45, costMin: 30, costMax: 60, icon: 'water-outline', color: COLORS.blue },
  { id: 'brakes', title: 'Brake Pad Replacement', category: 'Brakes', difficulty: 'Moderate', timeMin: 60, timeMax: 90, costMin: 50, costMax: 120, icon: 'stop-circle-outline', color: COLORS.heartRed },
  { id: 'tires', title: 'Tire Rotation & Inspection', category: 'Tires', difficulty: 'Easy', timeMin: 20, timeMax: 30, costMin: 0, costMax: 20, icon: 'disc-outline', color: COLORS.starBlue },
  { id: 'coolant', title: 'Coolant Flush & Replace', category: 'Fluids', difficulty: 'Easy', timeMin: 30, timeMax: 45, costMin: 20, costMax: 40, icon: 'rainy-outline', color: COLORS.starBlue },
  { id: 'air-filter', title: 'Engine Air Filter Change', category: 'Engine', difficulty: 'Easy', timeMin: 10, timeMax: 15, costMin: 10, costMax: 30, icon: 'leaf-outline', color: COLORS.xpGreen },
  { id: 'spark', title: 'Spark Plug Replacement', category: 'Engine', difficulty: 'Moderate', timeMin: 45, timeMax: 90, costMin: 20, costMax: 60, icon: 'flash-outline', color: COLORS.blue },
  { id: 'battery', title: 'Battery Testing & Replace', category: 'Electrical', difficulty: 'Easy', timeMin: 15, timeMax: 30, costMin: 80, costMax: 200, icon: 'battery-half-outline', color: COLORS.xpGreen },
  { id: 'cabin-filter', title: 'Cabin Air Filter Replace', category: 'Body', difficulty: 'Easy', timeMin: 10, timeMax: 20, costMin: 10, costMax: 25, icon: 'filter-outline', color: COLORS.starBlue },
  { id: 'trans-fluid', title: 'Transmission Fluid Check', category: 'Fluids', difficulty: 'Moderate', timeMin: 30, timeMax: 60, costMin: 30, costMax: 80, icon: 'settings-outline', color: COLORS.levelPurple },
  { id: 'wipers', title: 'Windshield Wiper Replacement', category: 'Body', difficulty: 'Easy', timeMin: 5, timeMax: 10, costMin: 15, costMax: 30, icon: 'brush-outline', color: COLORS.xpGreen },
  { id: 'headlights', title: 'Headlight Bulb Change', category: 'Electrical', difficulty: 'Easy', timeMin: 15, timeMax: 30, costMin: 10, costMax: 40, icon: 'bulb-outline', color: COLORS.blue },
  { id: 'serpentine', title: 'Serpentine Belt Inspection', category: 'Engine', difficulty: 'Hard', timeMin: 60, timeMax: 120, costMin: 25, costMax: 75, icon: 'sync-outline', color: COLORS.heartRed },
];

const CATEGORIES = ['All', 'Engine', 'Brakes', 'Tires', 'Fluids', 'Electrical', 'Body'];

const DIFFICULTY_COLORS: Record<string, { bg: string; fg: string }> = {
  Easy: { bg: COLORS.successLight, fg: COLORS.success },
  Moderate: { bg: COLORS.warningLight, fg: COLORS.warning },
  Hard: { bg: COLORS.dangerLight, fg: COLORS.danger },
};

export default function GuidesScreen() {
  const { activeCar } = useActiveCar();
  const router = useRouter();
  const c = getColors();

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const vehicleLabel = activeCar
    ? [activeCar.year, activeCar.make?.trim(), activeCar.model?.trim()].filter(Boolean).join(' ')
    : 'your vehicle';

  const isEV = activeCar 
    ? isElectricVehicle(activeCar.make ?? '', activeCar.model ?? '')
    : false;

  // Guides that don't apply to EVs
  const EV_EXCLUDED_GUIDE_IDS = ['oil', 'spark', 'serpentine', 'coolant', 'trans-fluid'];

  const generateGuide = async () => {
    const query = aiPrompt.trim();
    if (!query) return;
    setAiGenerating(true);
    setAiResult(null);
    const apiKey = process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY;
    if (!apiKey) {
      Alert.alert('Error', 'AI service is not configured.');
      setAiGenerating(false);
      return;
    }
    const timeout = setTimeout(() => { setAiGenerating(false); }, 30000);
    try {
      const systemPrompt = `You are an expert automotive mechanic. Generate a detailed DIY repair guide. 
You MUST respond in valid JSON format only, no other text. Use this exact structure:
{
  "title": "Guide title",
  "difficulty": "Easy" or "Moderate" or "Hard",
  "estimatedTime": "X-Y min",
  "estimatedSavings": "$X-Y",
  "toolsNeeded": ["tool1", "tool2"],
  "partsNeeded": ["part1", "part2"],
  "steps": [
    { "number": 1, "title": "Step title", "description": "Detailed step instructions" },
    { "number": 2, "title": "Step title", "description": "Detailed step instructions" }
  ]
}
Vehicle: ${activeCar ? `${activeCar.year} ${activeCar.make} ${activeCar.model}` : vehicleLabel}
Engine: ${(activeCar as any)?.engine_code || 'Not specified'}`;
      const response = await fetch(DEEPSEEK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'deepseek-chat',
          max_tokens: 2048,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Generate a DIY guide for: ${query}` },
          ],
        }),
      });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`API error ${response.status}`);
      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;
      if (!text) throw new Error('Empty response');
      try {
        const cleaned = text.replace(/```json|```/g, '').trim();
        const guideObj = JSON.parse(cleaned);
        // Navigate to detailed step view with generated guide
        router.push({
          pathname: '/guide-detail',
          params: { guideData: JSON.stringify(guideObj) },
        });
      } catch (e) {
        // Fallback: show raw text in current card if JSON parsing fails
        setAiResult(text);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
      }
    } catch (err) {
      Alert.alert('Error', 'Could not generate guide. Please try again.');
    } finally { setAiGenerating(false); clearTimeout(timeout); }
  };

  const filtered = useMemo(() => {
    return GUIDES.filter((g) => {
      const matchCategory = activeCategory === 'All' || g.category === activeCategory;
      const matchSearch = !search || g.title.toLowerCase().includes(search.toLowerCase());
      const matchesVehicle = isEV ? !EV_EXCLUDED_GUIDE_IDS.includes(g.id) : true;
      return matchCategory && matchSearch && matchesVehicle;
    });
  }, [search, activeCategory, isEV]);

  const carName = activeCar
    ? [activeCar.make?.trim(), activeCar.model?.trim()].filter(Boolean).join(' ')
    : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={[TYPE.displayMD, { color: c.text, marginBottom: SPACING.md }]}>DIY Guides</Text>

        {/* Search bar */}
        <View style={[styles.searchBar, { backgroundColor: COLORS.surfaceSecondary }]}>
          <Ionicons name="search" size={18} color={c.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search guides..."
            placeholderTextColor={c.textMuted}
            style={[styles.searchInput, { color: c.text }]}
          />
        </View>

        {/* Category pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categoryRow}>
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setActiveCategory(cat)}
                style={({ pressed }) => [
                  styles.categoryChip,
                  { backgroundColor: isActive ? COLORS.primaryLight : COLORS.surfaceSecondary },
                  pressed && { opacity: 0.88 },
                ]}
              >
                <Text style={[TYPE.label, { color: isActive ? COLORS.primary : c.textSecondary }]}>{cat}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Featured guide */}
        {carName && (
          <ChunkyCard
            style={styles.featuredCard}
            onPress={() =>
              router.push({ pathname: '/guide-detail', params: { id: isEV ? 'cabin-filter' : 'oil' } })
            }
          >
            <Text style={[TYPE.labelSM, { color: COLORS.primary }]}>Recommended for your {carName}</Text>
            <Text style={[TYPE.h2, { color: c.text, marginTop: 4 }]}>{isEV ? 'Cabin Air Filter Replace' : 'How to Change Your Oil'}</Text>
            <View style={styles.featuredMeta}>
              <View style={[styles.diffPill, { backgroundColor: DIFFICULTY_COLORS.Easy.bg }]}>
                <Text style={[TYPE.labelSM, { color: DIFFICULTY_COLORS.Easy.fg }]}>Easy</Text>
              </View>
              <Text style={[TYPE.bodySM, { color: c.textSecondary }]}>30-45 min</Text>
            </View>
          </ChunkyCard>
        )}

        {isEV && (
          <View style={[styles.evNotice, { backgroundColor: COLORS.primaryLight, marginBottom: SPACING.lg }]}>
            <Ionicons name="information-circle-outline" size={22} color={COLORS.primary} style={{ marginRight: SPACING.md }} />
            <View style={{ flex: 1 }}>
              <Text style={[TYPE.h3, { color: c.text }]}>Electric vehicle detected</Text>
              <Text style={[TYPE.bodySM, { color: c.textSecondary, marginTop: 4 }]}>
                Guides for oil changes, spark plugs, coolant, and serpentine belts are hidden — they do not apply to your {activeCar?.make} {activeCar?.model}.
              </Text>
            </View>
          </View>
        )}

        {/* Progress bar */}
        <View style={styles.progressRow}>
          <View style={[styles.progressTrack, { backgroundColor: COLORS.border }]}>
            <View style={[styles.progressFill, { width: '25%' }]} />
          </View>
          <Text style={[TYPE.bodySM, { color: c.textSecondary }]}>3/{GUIDES.length} completed</Text>
        </View>

        {/* Guide cards */}
        {filtered.map((guide) => (
          <ChunkyCard
            key={guide.id}
            style={styles.guideCard}
            onPress={() =>
              router.push({ pathname: '/guide-detail', params: { id: guide.id } })
            }
          >
            <View style={styles.guideRow}>
              <View style={[styles.guideIcon, { backgroundColor: COLORS.primaryLight }]}>
                <Ionicons name={guide.icon} size={22} color={COLORS.primary} />
              </View>
              <View style={styles.guideInfo}>
                <Text style={[TYPE.h3, { color: c.text }]}>{guide.title}</Text>
                <View style={styles.guideMeta}>
                  <View style={[styles.diffPill, { backgroundColor: DIFFICULTY_COLORS[guide.difficulty]?.bg ?? COLORS.surfaceSecondary }]}>
                    <Text style={[TYPE.labelSM, { color: DIFFICULTY_COLORS[guide.difficulty]?.fg ?? COLORS.textMuted }]}>{guide.difficulty}</Text>
                  </View>
                  <Text style={[TYPE.bodySM, { color: c.textSecondary }]}>{guide.timeMin}-{guide.timeMax} min</Text>
                  <Text style={[TYPE.bodySM, { color: c.textSecondary }]}>${guide.costMin}-{guide.costMax}</Text>
                </View>
              </View>
              <View style={styles.guideRight}>
                <View style={styles.xpMini}>
                  <Text style={styles.xpMiniText}>+{XP_REWARDS.COMPLETE_GUIDE} XP</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={c.textMuted} style={{ marginTop: 6 }} />
              </View>
            </View>
          </ChunkyCard>
        ))}

        {/* AI Guide Generator */}
        <ChunkyCard style={styles.aiGenCard}>
          <Ionicons name="sparkles-outline" size={32} color={COLORS.primary} />
          <Text style={[TYPE.h3, { color: c.text, marginTop: SPACING.sm }]}>Can&apos;t find what you need?</Text>
          <Text style={[TYPE.bodySM, { color: c.textSecondary, marginTop: 4 }]}>
            Describe any repair and Wrenchy will generate a custom guide for your {vehicleLabel}.
          </Text>
          <TextInput
            value={aiPrompt}
            onChangeText={setAiPrompt}
            placeholder="e.g. Replace alternator, fix AC, change spark plugs..."
            placeholderTextColor={COLORS.textMuted}
            editable={!aiGenerating}
            style={[styles.aiInput, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}
          />
          <View style={styles.aiGenRow}>
            <ChunkyButton
              title={aiGenerating ? 'Generating...' : 'Generate guide'}
              onPress={generateGuide}
              disabled={aiGenerating || !aiPrompt.trim()}
              style={{ flex: 1 }}
            />
            <View style={styles.aiXpBadge}>
              <Text style={styles.aiXpText}>+{XP_REWARDS.COMPLETE_GUIDE} XP</Text>
            </View>
          </View>
          {aiGenerating && (
            <View style={styles.aiLoadingRow}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={[TYPE.bodySM, { color: c.textSecondary, marginLeft: SPACING.sm }]}>Wrenchy is writing your guide...</Text>
            </View>
          )}
        </ChunkyCard>

        {/* AI Generated Guide Result */}
        {aiResult && (
          <ChunkyCard style={styles.aiResultCard}>
            <View style={styles.aiResultHeader}>
              <Ionicons name="document-text-outline" size={22} color={COLORS.primary} />
              <Text style={[TYPE.h3, { color: c.text, flex: 1 }]}>Custom Guide</Text>
              <View style={styles.xpMini}>
                <Text style={styles.xpMiniText}>+{XP_REWARDS.COMPLETE_GUIDE} XP</Text>
              </View>
            </View>
            <View style={[styles.aiResultDivider, { backgroundColor: c.divider }]} />
            {aiResult.split('\n').filter(l => l.trim()).map((line, i) => {
              const trimmed = line.trim();
              if (/^\d+\./.test(trimmed)) {
                const match = trimmed.match(/^\d+/);
                const num = match?.[0] ?? String();
                const rest = trimmed.replace(/^\d+\./, '').trim();
                return (
                  <View key={i} style={styles.aiStepRow}>
                    <Text style={[TYPE.label, { color: COLORS.primary, minWidth: 24 }]}>{num}.</Text>
                    <Text style={[TYPE.body, { color: c.text, flex: 1 }]}>{rest}</Text>
                  </View>
                );
              }
              const isHeader = trimmed.endsWith(':') || trimmed.length < 40;
              return (
                <Text key={i} style={[isHeader ? TYPE.h3 : TYPE.body, { color: isHeader ? c.text : c.textSecondary, marginBottom: 6 }]}>
                  {trimmed}
                </Text>
              );
            })}
          </ChunkyCard>
        )}

        <View style={{ height: SPACING.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xxxl, paddingTop: SPACING.lg },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0,
    borderRadius: 10,
    height: 44,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  searchInput: {
    flex: 1,
    ...TYPE.body,
    padding: 0,
  },

  categoryScroll: { marginBottom: SPACING.lg, marginLeft: -SPACING.xl },
  categoryRow: { paddingHorizontal: SPACING.xl, gap: SPACING.sm },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },

  evNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    padding: SPACING.lg,
  },

  featuredCard: { marginBottom: SPACING.lg },
  featuredMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.sm },

  progressRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.lg },
  progressTrack: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },

  guideCard: { marginBottom: SPACING.md },
  guideRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  guideIcon: { width: 48, height: 48, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  guideIconText: { fontSize: 24 },
  guideInfo: { flex: 1, gap: 4 },
  guideMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  guideRight: { alignItems: 'center' },

  diffPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.pill },
  xpMini: { backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 2 },
  xpMiniText: { ...TYPE.labelSM, color: COLORS.primary, fontSize: 10 },

  aiGenCard: { marginTop: SPACING.xl },
  aiInput: {
    borderWidth: 0.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    height: 48,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    ...TYPE.body,
    color: COLORS.textPrimary,
  },
  aiGenRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.md },
  aiXpBadge: { backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 0.5, borderColor: COLORS.border },
  aiXpText: { ...TYPE.labelSM, color: COLORS.primary },
  aiLoadingRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.md },
  aiResultCard: { marginTop: SPACING.lg },
  aiResultHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  aiResultDivider: { height: 1, marginBottom: SPACING.md },
  aiStepRow: { flexDirection: 'row', marginBottom: 8, gap: 4 },
});
