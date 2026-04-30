import React, { useState, useMemo, useRef } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useActiveCar } from '@/contexts/ActiveCarContext';
import { COLORS, SPACING, RADIUS, TYPE, getColors } from '@/constants/DesignSystem';
import { ChunkyCard } from '@/components/ui/ChunkyCard';
import { ChunkyButton } from '@/components/ui/ChunkyButton';
import { XP_REWARDS } from '@/lib/xpSystem';

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
  icon: string;
  color: string;
}

const GUIDES: Guide[] = [
  { id: 'oil', title: 'How to Change Your Oil', category: 'Engine', difficulty: 'Easy', timeMin: 30, timeMax: 45, costMin: 30, costMax: 60, icon: '🛢️', color: COLORS.blue },
  { id: 'brakes', title: 'Brake Pad Replacement', category: 'Brakes', difficulty: 'Moderate', timeMin: 60, timeMax: 90, costMin: 50, costMax: 120, icon: '🛑', color: COLORS.heartRed },
  { id: 'tires', title: 'Tire Rotation & Inspection', category: 'Tires', difficulty: 'Easy', timeMin: 20, timeMax: 30, costMin: 0, costMax: 20, icon: '🛞', color: COLORS.starBlue },
  { id: 'coolant', title: 'Coolant Flush & Replace', category: 'Fluids', difficulty: 'Easy', timeMin: 30, timeMax: 45, costMin: 20, costMax: 40, icon: '💧', color: COLORS.starBlue },
  { id: 'air-filter', title: 'Engine Air Filter Change', category: 'Engine', difficulty: 'Easy', timeMin: 10, timeMax: 15, costMin: 10, costMax: 30, icon: '💨', color: COLORS.xpGreen },
  { id: 'spark', title: 'Spark Plug Replacement', category: 'Engine', difficulty: 'Moderate', timeMin: 45, timeMax: 90, costMin: 20, costMax: 60, icon: '⚡', color: COLORS.blue },
  { id: 'battery', title: 'Battery Testing & Replace', category: 'Electrical', difficulty: 'Easy', timeMin: 15, timeMax: 30, costMin: 80, costMax: 200, icon: '🔋', color: COLORS.xpGreen },
  { id: 'cabin-filter', title: 'Cabin Air Filter Replace', category: 'Body', difficulty: 'Easy', timeMin: 10, timeMax: 20, costMin: 10, costMax: 25, icon: '🌬️', color: COLORS.starBlue },
  { id: 'trans-fluid', title: 'Transmission Fluid Check', category: 'Fluids', difficulty: 'Moderate', timeMin: 30, timeMax: 60, costMin: 30, costMax: 80, icon: '⚙️', color: COLORS.levelPurple },
  { id: 'wipers', title: 'Windshield Wiper Replacement', category: 'Body', difficulty: 'Easy', timeMin: 5, timeMax: 10, costMin: 15, costMax: 30, icon: '🧹', color: COLORS.xpGreen },
  { id: 'headlights', title: 'Headlight Bulb Change', category: 'Electrical', difficulty: 'Easy', timeMin: 15, timeMax: 30, costMin: 10, costMax: 40, icon: '💡', color: COLORS.blue },
  { id: 'serpentine', title: 'Serpentine Belt Inspection', category: 'Engine', difficulty: 'Hard', timeMin: 60, timeMax: 120, costMin: 25, costMax: 75, icon: '🔄', color: COLORS.heartRed },
];

const CATEGORIES = ['All', 'Engine', 'Brakes', 'Tires', 'Fluids', 'Electrical', 'Body'];

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: COLORS.xpGreen,
  Moderate: COLORS.blue,
  Hard: COLORS.heartRed,
};

export default function GuidesScreen() {
  const { isDark } = useTheme();
  const { activeCar } = useActiveCar();
  const router = useRouter();
  const c = getColors(isDark);

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const vehicleLabel = activeCar
    ? [activeCar.year, activeCar.make?.trim(), activeCar.model?.trim()].filter(Boolean).join(' ')
    : 'your vehicle';

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
      return matchCategory && matchSearch;
    });
  }, [search, activeCategory]);

  const carName = activeCar
    ? [activeCar.make?.trim(), activeCar.model?.trim()].filter(Boolean).join(' ')
    : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={[TYPE.displayMD, { color: c.text, marginBottom: SPACING.md }]}>DIY Guides</Text>

        {/* Search bar */}
        <View style={[styles.searchBar, { backgroundColor: c.surface, borderColor: c.border }]}>
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
              <ChunkyCard
                key={cat}
                variant={isActive ? 'blue' : 'default'}
                onPress={() => setActiveCategory(cat)}
                style={{
                  ...styles.categoryPill,
                  ...(isActive ? { backgroundColor: COLORS.blue } : {}),
                }}
              >
                <Text style={[TYPE.label, { color: isActive ? '#000' : c.textSecondary }]}>{cat}</Text>
              </ChunkyCard>
            );
          })}
        </ScrollView>

        {/* Featured guide */}
        {carName && (
          <ChunkyCard
            variant="blue"
            style={styles.featuredCard}
            onPress={() =>
              router.push({ pathname: '/guide-detail', params: { id: 'oil' } })
            }
          >
            <Text style={[TYPE.labelSM, { color: COLORS.blueDark }]}>Recommended for your {carName}</Text>
            <Text style={[TYPE.h2, { color: '#000', marginTop: 4 }]}>How to Change Your Oil</Text>
            <View style={styles.featuredMeta}>
              <View style={[styles.diffPill, { backgroundColor: COLORS.xpGreenLight }]}>
                <Text style={[TYPE.labelSM, { color: COLORS.xpGreenDark }]}>Easy</Text>
              </View>
              <Text style={[TYPE.bodySM, { color: '#00000088' }]}>30-45 min</Text>
            </View>
          </ChunkyCard>
        )}

        {/* Progress bar */}
        <View style={styles.progressRow}>
          <View style={[styles.progressTrack, { backgroundColor: isDark ? '#2A2A2A' : '#E5E5E5' }]}>
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
              <View style={[styles.guideIcon, { backgroundColor: guide.color + '20' }]}>
                <Text style={styles.guideIconText}>{guide.icon}</Text>
              </View>
              <View style={styles.guideInfo}>
                <Text style={[TYPE.h3, { color: c.text }]}>{guide.title}</Text>
                <View style={styles.guideMeta}>
                  <View style={[styles.diffPill, { backgroundColor: DIFFICULTY_COLORS[guide.difficulty] + '20' }]}>
                    <Text style={[TYPE.labelSM, { color: DIFFICULTY_COLORS[guide.difficulty] }]}>{guide.difficulty}</Text>
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
        <ChunkyCard variant="blue" style={styles.aiGenCard}>
          <Text style={{ fontSize: 28 }}>🤖</Text>
          <Text style={[TYPE.h3, { color: '#000', marginTop: SPACING.sm }]}>Can&apos;t find what you need?</Text>
          <Text style={[TYPE.bodySM, { color: '#00000088', marginTop: 4 }]}>
            Describe any repair and Wrenchy will generate a custom guide for your {vehicleLabel}.
          </Text>
          <TextInput
            value={aiPrompt}
            onChangeText={setAiPrompt}
            placeholder="e.g. Replace alternator, fix AC, change spark plugs..."
            placeholderTextColor="#00000055"
            editable={!aiGenerating}
            style={[styles.aiInput, { backgroundColor: isDark ? '#ffffff20' : '#00000008', borderColor: COLORS.blueDark }]}
          />
          <View style={styles.aiGenRow}>
            <ChunkyButton
              title={aiGenerating ? 'Generating...' : 'Generate Guide ✨'}
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
              <ActivityIndicator size="small" color={COLORS.blueDark} />
              <Text style={[TYPE.bodySM, { color: '#00000088', marginLeft: SPACING.sm }]}>Wrenchy is writing your guide...</Text>
            </View>
          )}
        </ChunkyCard>

        {/* AI Generated Guide Result */}
        {aiResult && (
          <ChunkyCard style={styles.aiResultCard}>
            <View style={styles.aiResultHeader}>
              <Text style={{ fontSize: 20 }}>🤖</Text>
              <Text style={[TYPE.h3, { color: c.text, flex: 1 }]}>Custom Guide</Text>
              <View style={styles.xpMini}>
                <Text style={styles.xpMiniText}>+{XP_REWARDS.COMPLETE_GUIDE} XP ⚡</Text>
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
                    <Text style={[TYPE.label, { color: COLORS.blue, minWidth: 24 }]}>{num}.</Text>
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
    borderWidth: 2.5,
    borderBottomWidth: 5,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
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
  categoryPill: { paddingVertical: SPACING.xs, paddingHorizontal: SPACING.lg },

  featuredCard: { marginBottom: SPACING.lg },
  featuredMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.sm },

  progressRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.lg },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.xpGreen, borderRadius: 3 },

  guideCard: { marginBottom: SPACING.md },
  guideRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  guideIcon: { width: 48, height: 48, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  guideIconText: { fontSize: 24 },
  guideInfo: { flex: 1, gap: 4 },
  guideMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  guideRight: { alignItems: 'center' },

  diffPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.pill },
  xpMini: { backgroundColor: COLORS.xpGreenLight, borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 2 },
  xpMiniText: { ...TYPE.labelSM, color: COLORS.xpGreenDark, fontSize: 10 },

  aiGenCard: { marginTop: SPACING.xl },
  aiInput: {
    borderWidth: 2, borderRadius: RADIUS.md, height: 48,
    paddingHorizontal: SPACING.lg, marginTop: SPACING.md,
    ...TYPE.body, color: '#000',
  },
  aiGenRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.md },
  aiXpBadge: { backgroundColor: COLORS.xpGreenLight, borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.xpGreen },
  aiXpText: { ...TYPE.labelSM, color: COLORS.xpGreenDark },
  aiLoadingRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.md },
  aiResultCard: { marginTop: SPACING.lg },
  aiResultHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  aiResultDivider: { height: 1, marginBottom: SPACING.md },
  aiStepRow: { flexDirection: 'row', marginBottom: 8, gap: 4 },
});
