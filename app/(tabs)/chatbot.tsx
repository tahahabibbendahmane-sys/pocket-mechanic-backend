import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  Keyboard,
  Pressable,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Markdown from 'react-native-markdown-display';
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  FadeInUp,
} from 'react-native-reanimated';

import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useChat, ChatMessage } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCar } from '@/contexts/ActiveCarContext';
import ChatHistoryModal from '@/components/ChatHistoryModal';
import { supabase } from '@/lib/supabase';
import { COLORS, getColors, TYPE, SPACING, RADIUS } from '@/constants/DesignSystem';
import { calculateFuelStats, getFuelLogs, type FuelStats } from '@/lib/fuelTracking';

const BLUE = COLORS.blue;

// AI Model Configuration
// To switch to OpenAI GPT-4o-mini:
// 1. Change provider to 'openai'
// 2. Set EXPO_PUBLIC_OPENAI_API_KEY
const AI_CONFIG = {
  provider: 'deepseek' as 'deepseek' | 'openai',
  deepseek: {
    url: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-chat',
    apiKey: process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY ?? '',
  },
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '',
  },
} as const;

type Vehicle = {
  id: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  current_mileage?: number;
  odometer?: number;
  kilometers?: number;
  trim?: string;
  engine?: string;
};

const MiniWrenchy = () => (
  <View style={[styles.miniAvatar, { alignSelf: 'flex-start' }]}>
    <Ionicons name="construct-outline" size={14} color="#FFF" />
  </View>
);

function TypingDots() {
  const t1 = useSharedValue(0);
  const t2 = useSharedValue(0);
  const t3 = useSharedValue(0);

  useEffect(() => {
    const bounce = (sv: typeof t1, delay: number) => {
      sv.value = withRepeat(
        withSequence(
          withTiming(0, { duration: delay }),
          withTiming(-8, { duration: 250, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 250, easing: Easing.in(Easing.ease) }),
        ),
        -1, false,
      );
    };
    bounce(t1, 0);
    bounce(t2, 150);
    bounce(t3, 300);
  }, [t1, t2, t3]);

  const s1 = useAnimatedStyle(() => ({ transform: [{ translateY: t1.value }] }));
  const s2 = useAnimatedStyle(() => ({ transform: [{ translateY: t2.value }] }));
  const s3 = useAnimatedStyle(() => ({ transform: [{ translateY: t3.value }] }));

  return (
    <View style={styles.typingBubble}>
      <ReAnimated.View style={[styles.typingDot, s1]} />
      <ReAnimated.View style={[styles.typingDot, s2]} />
      <ReAnimated.View style={[styles.typingDot, s3]} />
    </View>
  );
}

const getSystemPrompt = (vehicle: {
  make: string;
  model: string;
  year: number;
  engine_code?: string;
  transmission?: string;
  current_mileage?: number;
}, fuelStats?: FuelStats | null) => {
  const fuelContext = fuelStats
    ? `
FUEL DATA:
- Average consumption: ${fuelStats.avgConsumption} L/100km
- Average cost per km: $${fuelStats.avgCostPerKm}
- Total fill-ups logged: ${fuelStats.fillUpCount}
- Last fill-up: ${fuelStats.lastFillUp?.date ? new Date(fuelStats.lastFillUp.date).toLocaleDateString() : 'None'}`
    : '';

  return `You are Wrenchy, an automotive maintenance assistant inside the Pocket Mechanic app.

VEHICLE CONTEXT:
- Make: ${vehicle.make}
- Model: ${vehicle.model}
- Year: ${vehicle.year}
- Engine: ${vehicle.engine_code || 'Not specified'}
- Transmission: ${vehicle.transmission || 'Not specified'}
- Current mileage: ${vehicle.current_mileage ? vehicle.current_mileage.toLocaleString() + ' km' : 'Not specified'}

${fuelContext}

CRITICAL RULES — FOLLOW THESE EXACTLY:

1. EVERY answer must be specific to the EXACT vehicle above. Never give generic advice. If the user asks about oil type, give the EXACT oil spec for their ${vehicle.year} ${vehicle.make} ${vehicle.model} — not a range of options.

2. If you are not 100% certain about a spec, part number, torque value, or procedure for this SPECIFIC vehicle, say \"I'm not 100% sure about this for your specific ${vehicle.year} ${vehicle.make} ${vehicle.model}. I recommend checking your owner's manual or a ${vehicle.make} dealer to confirm.\" NEVER guess or make up specs.

3. When giving maintenance intervals, base them on the manufacturer's recommended schedule for this vehicle, not generic rules of thumb. Reference the owner's manual schedule when possible.

4. For tire pressure: give the manufacturer-recommended PSI found on the driver's door jamb sticker, NOT the max PSI on the tire sidewall. If you don't know the exact value for this vehicle, say so.

5. For oil type: give the EXACT viscosity grade and spec (e.g. \"0W-20 meeting API SP\" or \"5W-30 meeting GM dexos1 Gen 3\"). Do not say \"5W-20 or 5W-30\" unless the manual actually lists both.

6. For parts and procedures: only describe parts and steps that actually exist for this vehicle. Do not invent part names, sensor locations, or procedures. If a repair procedure varies by trim level or engine option and you're unsure which applies, ask the user for clarification.

7. Be concise. Give the direct answer first, then explain if needed. Do not pad responses with unnecessary warnings or disclaimers unless safety is genuinely at risk.

8. Never contradict something you said earlier in the same conversation. If the user points out a contradiction, acknowledge it and correct yourself.

9. Use metric units (km, liters) by default since the user's app is set to kilometers. Include imperial equivalents in parentheses only if helpful.

10. You are helpful and knowledgeable but honest about your limits. A confident wrong answer is worse than admitting uncertainty.

11. Keep formatting minimal. Use **bold** sparingly for key specs only (like oil type or PSI values). Do not use headers (#), excessive bullet points, or complex formatting. Write in natural paragraphs. Short, clear responses are better than long formatted ones.`;
};

// Markdown rendering is applied only to assistant (Wrenchy) messages.

export default function ChatbotScreen() {
  const { isDark } = useTheme();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { activeCar } = useActiveCar();
  const c = getColors(isDark);

  const { messages, setMessages, clearChat } = useChat();
  const params = useLocalSearchParams<{ initialMessage?: string }>();
  const initialMessage = typeof params.initialMessage === 'string' ? params.initialMessage : '';

  useEffect(() => { if (initialMessage.trim()) setInput(initialMessage); }, [initialMessage]);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedCar, setSelectedCar] = useState<Vehicle | null>(activeCar || null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const messagesRef = useRef<ChatMessage[]>(messages);

  const bobY = useSharedValue(0);
  useEffect(() => {
    bobY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, true,
    );
  }, [bobY]);
  const bobStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bobY.value }] }));

  useEffect(() => { setSelectedCar(activeCar || null); }, [activeCar?.id]);

  const saveConversationToHistory = useCallback(async () => {
    try {
      const historyMessages = messagesRef.current;
      if (historyMessages.length <= 1) return;
      const existing = await AsyncStorage.getItem('chat_history');
      const history = existing ? JSON.parse(existing) : [];
      const previewSource = historyMessages[1] ?? historyMessages[0];
      const basePreview = previewSource?.text ?? '';
      const preview = basePreview.length > 60 ? `${basePreview.slice(0, 60)}...` : basePreview;
      const session = { id: Date.now().toString(), date: new Date().toISOString(), preview, messages: historyMessages };
      const updated = [session, ...(Array.isArray(history) ? history : [])].slice(0, 20);
      await AsyncStorage.setItem('chat_history', JSON.stringify(updated));
    } catch { /* silent */ }
  }, []);

  const prevVehicleIdRef = useRef<string | null>(activeCar?.id ?? null);
  useEffect(() => {
    const switchVehicle = async () => {
      const prevId = prevVehicleIdRef.current;
      const nextId = activeCar?.id ?? null;
      if (prevId && nextId && prevId !== nextId) {
        // Save current chat to history first (if any messages), then start fresh
        if ((messagesRef.current?.length ?? 0) > 0) {
          await saveConversationToHistory();
        }
        setMessages([]);
        setIsLoading(false);
        setInput('');
        setShowPicker(false);
      }
      prevVehicleIdRef.current = nextId;
    };
    switchVehicle();
  }, [activeCar?.id, saveConversationToHistory, setMessages]);

  const prevSelectedCarIdRef = useRef<string | null>(selectedCar?.id ?? null);
  useEffect(() => {
    const switchSelectedCar = async () => {
      const prevId = prevSelectedCarIdRef.current;
      const nextId = selectedCar?.id ?? null;
      if (prevId && nextId && prevId !== nextId) {
        console.log('[chatbot] vehicle switched (picker):', prevId, '→', nextId);
        if ((messagesRef.current?.length ?? 0) > 0) {
          await saveConversationToHistory();
        }
        setMessages([]);
        setIsLoading(false);
        setInput('');
        setShowPicker(false);
      }
      prevSelectedCarIdRef.current = nextId;
    };
    switchSelectedCar();
  }, [selectedCar?.id, saveConversationToHistory, setMessages]);

  useEffect(() => {
    let mounted = true;
    const initialize = async () => {
      try {
        await supabase.auth.getSession();
      } catch { /* silent */ }
      finally { if (mounted) setIsReady(true); }
    };
    initialize();
    return () => { mounted = false; };
  }, []);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { flatListRef.current?.scrollToEnd({ animated: true }); }, [messages.length]);

  const rawDisplayName = (profile?.displayName || '').trim();
  void rawDisplayName;

  const suggestions = useMemo(
    () => [
      '🔧 What maintenance is due based on my mileage?',
      '⚠️ What are known issues on my vehicle?',
      '🛢️ What are the exact fluid specs for my car?',
      '🛞 What tires are recommended for my car?',
      '💰 What repairs can I do myself to save money?',
    ],
    []
  );

  useFocusEffect(
    useCallback(() => {
      const fetchGarage = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const { data, error } = await supabase.from('vehicles').select('*').eq('user_id', session.user.id);
            if (error) throw error;
            if (data && data.length > 0) {
              const normalizedVehicles = data.map((row: any) => ({
                ...row,
                mileage: row.mileage ?? row.current_mileage ?? row.odometer ?? row.kilometers ?? 0,
              }));
              setVehicles(normalizedVehicles);
              if (!selectedCar) setSelectedCar(normalizedVehicles[0]);
            } else { setVehicles([]); }
          } else {
            const stored = await AsyncStorage.getItem('guest_garage');
            const parsed = stored ? JSON.parse(stored) : [];
            setVehicles(Array.isArray(parsed) ? parsed : []);
          }
        } catch { /* silent */ }
        finally { setIsLoading(false); }
      };
      fetchGarage();
      return () => {
        if (messagesRef.current.length > 1) saveConversationToHistory();
        clearChat();
      };
    }, [clearChat, saveConversationToHistory])
  );

  const sendMessage = async (textOverride?: string) => {
    if (!isReady) return;
    const textToSend = textOverride ?? input;
    if (!textToSend.trim()) return;
    const userMessage: ChatMessage = { _id: Date.now().toString(), text: textToSend, createdAt: new Date(), user: { _id: 1, name: t.aiChat.me } };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    const loadingId = `loading-${Date.now()}`;
    setMessages(prev => [...prev, { _id: loadingId, text: t.aiChat.thinking, createdAt: new Date(), user: { _id: 2, name: t.aiChat.pocketMechanic } }]);

    const config = AI_CONFIG[AI_CONFIG.provider];
    const apiKey = config.apiKey;

    const currentVehicle = (selectedCar ?? activeCar) as any;
    const vehicle = currentVehicle
      ? {
          make: String(currentVehicle.make ?? ''),
          model: String(currentVehicle.model ?? ''),
          year: Number(currentVehicle.year ?? 0),
          engine_code: (currentVehicle.engine_code ?? currentVehicle.engine_code ?? currentVehicle.engine ?? currentVehicle.engineCode) as string | undefined,
          transmission: (currentVehicle.transmission ?? currentVehicle.transmission_style) as string | undefined,
          current_mileage: (currentVehicle.current_mileage ?? currentVehicle.mileage ?? 0) as number | undefined,
        }
      : null;

    let fuelStats: FuelStats | null = null;
    try {
      if (currentVehicle?.id) {
        const fuelLogs = await getFuelLogs(String(currentVehicle.id));
        fuelStats = fuelLogs.length > 0 ? calculateFuelStats(fuelLogs) : null;
      }
    } catch {
      fuelStats = null;
    }

    const conversationHistory = messages
      .filter((m) => !String(m._id).startsWith('loading-') && !String(m._id).startsWith('connecting-'))
      .slice(-20)
      .map((m) => ({
        role: m.user?._id === 1 ? 'user' : 'assistant',
        content: m.text,
      }));

    const messagesPayload = [
      {
        role: 'system',
        content: vehicle
          ? getSystemPrompt(vehicle, fuelStats)
          : getSystemPrompt({ make: 'Unknown', model: 'Unknown', year: 0 }, null),
      },
      ...conversationHistory,
      { role: 'user', content: textToSend },
    ];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) await supabase.from('chat_history').insert({ user_id: session.user.id, role: 'user', content: textToSend });
      if (!apiKey) throw new Error('AI API key missing');
      const response = await fetch(config.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: config.model,
          messages: messagesPayload,
          temperature: 0.3,
          max_tokens: 1024,
        }),
      });
      if (!response.ok) throw new Error(`API error ${response.status}`);
      const data = await response.json();
      const aiText = data?.choices?.[0]?.message?.content;
      if (!aiText) throw new Error('Empty response');
      setMessages(prev => prev.filter(msg => msg._id !== loadingId));
      setMessages(prev => [...prev, { _id: Date.now().toString(), text: aiText, createdAt: new Date(), user: { _id: 2, name: t.aiChat.pocketMechanic } }]);
      if (session) await supabase.from('chat_history').insert({ user_id: session.user.id, role: 'assistant', content: aiText });
    } catch {
      setMessages(prev => prev.filter(msg => msg._id !== loadingId));
      setMessages(prev => [...prev, { _id: Date.now().toString(), text: "Sorry, I couldn't process that. Please try again.", createdAt: new Date(), user: { _id: 2, name: t.aiChat.pocketMechanic } }]);
    } finally { setIsLoading(false); }
  };

  const handleSuggestionPress = (text: string) => {
    // Strip leading emoji/icon so the user's message is clean
    const cleaned = text.replace(/^[\p{Emoji}\s]+/u, '').trim();
    sendMessage(cleaned);
  };

  const handleSelectHistorySession = useCallback((sessionMessages: ChatMessage[]) => {
    setMessages(sessionMessages);
    setIsHistoryVisible(false);
    setTimeout(() => { flatListRef.current?.scrollToEnd({ animated: false }); }, 50);
  }, [setMessages]);

  const sendPressed = useSharedValue(0);
  const sendAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendPressed.value ? 0.88 : 1 }],
  }));

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
      <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
        {/* HEADER */}
        <View style={[styles.header, { backgroundColor: c.background }]}>
          <TouchableOpacity onPress={() => setIsHistoryVisible(true)} style={styles.headerIconBtn}>
            <MaterialIcons name="history" size={18} color={c.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.carPill, { backgroundColor: isDark ? '#ffffff10' : '#00000008', borderColor: c.border }]}
            onPress={() => setShowPicker(true)}
          >
            <Text style={[styles.carPillText, { color: c.text }]} numberOfLines={1}>
              {selectedCar ? [selectedCar.year, selectedCar.make?.trim(), selectedCar.model?.trim()].filter(Boolean).join(' ') : t.aiChat.selectCar}
            </Text>
            <Ionicons name="chevron-down" size={14} color={c.textMuted} />
          </TouchableOpacity>
          <View style={styles.headerRight}>
            {messages.length > 0 && (
              <TouchableOpacity onPress={clearChat} style={styles.headerIconBtn}>
                <Ionicons name="trash-outline" size={18} color={c.textMuted} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={clearChat} style={styles.headerIconBtn}>
              <Ionicons name="refresh" size={18} color={c.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* CAR PICKER MODAL */}
        <Modal visible={showPicker} transparent animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowPicker(false)} activeOpacity={1}>
            <View style={[styles.modalContent, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[TYPE.h2, { color: c.text, textAlign: 'center', marginBottom: SPACING.lg }]}>{t.aiChat.chooseVehicle}</Text>
              {vehicles.map(car => (
                <TouchableOpacity
                  key={car.id}
                  style={[styles.carOption, { borderColor: c.divider }]}
                  onPress={async () => {
                    // Save current conversation first, then switch vehicle and reset chat
                    if ((messagesRef.current?.length ?? 0) > 0) {
                      await saveConversationToHistory();
                    }
                    setSelectedCar(car);
                    setMessages([]);
                    setIsLoading(false);
                    setInput('');
                    setShowPicker(false);
                  }}
                >
                  <Text style={[TYPE.body, { color: selectedCar?.id === car.id ? BLUE : c.textSecondary }]}>
                    {car.year} {car.make} {car.model}
                  </Text>
                  {selectedCar?.id === car.id && <Ionicons name="checkmark" size={20} color={BLUE} />}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* CHAT AREA */}
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyBody}>
              <View style={styles.emptyCenter}>
                <ReAnimated.View style={bobStyle}>
                  <View style={[styles.smallIcon, { backgroundColor: BLUE }]}>
                    <Ionicons name="construct-outline" size={22} color="#FFF" />
                  </View>
                </ReAnimated.View>

                <Text style={[TYPE.h1, { color: c.text, textAlign: 'center' }]}>What can I help you with?</Text>

                <View style={[styles.suggestionBox, { borderColor: c.border, backgroundColor: c.surface }]}>
                  {suggestions.map((s, idx) => (
                    <Pressable
                      key={s}
                      onPress={() => handleSuggestionPress(s)}
                      style={({ pressed }) => [
                        styles.suggestionRow,
                        pressed && { backgroundColor: isDark ? '#ffffff08' : '#00000006' },
                        idx < suggestions.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.divider },
                      ]}
                    >
                      <Text style={[TYPE.body, { color: c.text }]}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item._id}
            style={{ flex: 1 }}
            contentContainerStyle={styles.chatContent}
            onTouchStart={() => Keyboard.dismiss()}
            renderItem={({ item, index }) => {
              const isLoadingBubble = item._id.startsWith('loading-') || item._id.startsWith('connecting-');
              const prev = index > 0 ? messages[index - 1] : null;
              const sameAsPrevSender = prev && prev.user?._id === item.user?._id;

              if (item.user?._id === 1) {
                return (
                  <ReAnimated.View entering={FadeInUp.duration(250).delay(50)} style={[styles.userRow, { marginTop: sameAsPrevSender ? 4 : 12 }]}>
                    <View style={styles.userBubble}>
                      <Text style={[TYPE.body, { color: '#FFF' }]}>{item.text}</Text>
                    </View>
                  </ReAnimated.View>
                );
              }

              const showAvatar = !sameAsPrevSender;
              return (
                <ReAnimated.View entering={FadeInUp.duration(200).easing(Easing.out(Easing.ease))} style={[styles.assistantRow, { marginTop: sameAsPrevSender ? 4 : 12 }]}>
                  {showAvatar ? <MiniWrenchy /> : <View style={styles.miniAvatarSpacer} />}
                  <View style={[styles.botBubble, { backgroundColor: c.surface, borderColor: c.border }]}>
                    {isLoadingBubble ? (
                      <TypingDots />
                    ) : (
                      <Markdown
                        style={{
                          body: {
                            color: c.text,
                            fontSize: 15,
                            lineHeight: 22,
                            fontFamily: 'Outfit_400Regular',
                          },
                          strong: {
                            fontFamily: 'Outfit_700Bold',
                            color: c.text,
                          },
                          bullet_list: {
                            marginVertical: 4,
                          },
                          list_item: {
                            marginVertical: 2,
                          },
                          paragraph: {
                            marginVertical: 4,
                          },
                          heading1: {
                            fontFamily: 'Outfit_700Bold',
                            fontSize: 20,
                            color: c.text,
                            marginVertical: 6,
                          },
                          heading2: {
                            fontFamily: 'Outfit_700Bold',
                            fontSize: 17,
                            color: c.text,
                            marginVertical: 4,
                          },
                          code_inline: {
                            backgroundColor: isDark ? '#00000015' : '#F0F0F0',
                            borderRadius: 4,
                            paddingHorizontal: 4,
                            fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                            fontSize: 13,
                          },
                        }}
                      >
                        {item.text}
                      </Markdown>
                    )}
                  </View>
                </ReAnimated.View>
              );
            }}
          />
        )}

        {/* INPUT BAR */}
        {(() => {
          const inputText = input;
          const setInputText = setInput;
          const handleSend = () => sendMessage();
          return (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.border }}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', backgroundColor: c.surface, borderRadius: 24, borderWidth: 1.5, borderColor: c.border, paddingLeft: 18, paddingRight: 6, minHeight: 48 }}>
                <TextInput
                  ref={inputRef}
                  style={{ flex: 1, fontSize: 15, color: c.text, paddingVertical: 12, maxHeight: 100, fontFamily: 'Outfit_400Regular' }}
                  placeholder="Ask Wrenchy anything..."
                  placeholderTextColor={c.textMuted}
                  multiline
                  value={inputText}
                  onChangeText={setInputText}
                  returnKeyType="send"
                  onSubmitEditing={handleSend}
                />
                <TouchableOpacity
                  onPress={handleSend}
                  disabled={!inputText.trim()}
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: inputText.trim() ? BLUE : '#E5E5E5', justifyContent: 'center', alignItems: 'center', marginBottom: 6, opacity: inputText.trim() ? 1 : 0.4 }}
                >
                  <Ionicons name="arrow-up" size={20} color={inputText.trim() ? '#FFFFFF' : '#999'} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })()}

        <ChatHistoryModal visible={isHistoryVisible} onClose={() => setIsHistoryVisible(false)} onSelectSession={handleSelectHistorySession} />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 10 },
  headerIconBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  carPill: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, gap: 6, maxWidth: 220 },
  carPillText: { ...TYPE.bodySM, fontSize: 12 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '82%', borderRadius: RADIUS.lg, borderWidth: 2.5, borderBottomWidth: 5, padding: SPACING.xl },
  carOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },

  // Empty state
  emptyState: { flex: 1, paddingHorizontal: SPACING.lg, paddingBottom: 8 },
  emptyBody: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 60 },
  emptyCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  smallIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  suggestionBox: { width: '100%', borderWidth: 1.5, borderRadius: 16, overflow: 'hidden', marginTop: 6 },
  suggestionRow: { paddingVertical: 16, paddingHorizontal: 16 },

  // Chat
  chatContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.lg, flexGrow: 1, justifyContent: 'flex-end' },
  userRow: { alignItems: 'flex-end' },
  userBubble: { maxWidth: '75%', alignSelf: 'flex-end', backgroundColor: BLUE, borderRadius: 20, borderBottomRightRadius: 6, paddingHorizontal: 14, paddingVertical: 10, marginRight: 4 },
  assistantRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  miniAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center' },
  miniAvatarSpacer: { width: 24, height: 24 },
  botBubble: { maxWidth: '75%', borderRadius: 20, borderBottomLeftRadius: 6, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1.5, alignSelf: 'flex-start' },

  // Input
  inputWrapper: { borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 8 },
  inputShell: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1.5,
    minHeight: 48,
    maxHeight: 120,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },

  // Typing
  typingBubble: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 10 },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: BLUE, marginHorizontal: 3 },
});
