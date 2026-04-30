import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import type { ChatMessage } from '../contexts/ChatContext';

type ChatSession = {
  id: string;
  date: string;
  preview: string;
  messages: ChatMessage[];
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelectSession: (messages: ChatMessage[]) => void;
};

const getDateLabel = (iso: string) => {
  const date = new Date(iso);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfToday.getDate() - 1);

  if (date >= startOfToday) return 'Today';
  if (date >= startOfYesterday) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export default function ChatHistoryModal({ visible, onClose, onSelectSession }: Props) {
  const { isDark } = useTheme();
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  const styles = useMemo(() => createStyles(isDark), [isDark]);

  const loadHistory = useCallback(async () => {
    try {
      const existing = await AsyncStorage.getItem('chat_history');
      const parsed = existing ? JSON.parse(existing) : [];
      setSessions(Array.isArray(parsed) ? parsed : []);
    } catch (e) {
      console.error('Failed to load chat history', e);
      setSessions([]);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadHistory();
    }
  }, [visible, loadHistory]);

  const handleClearHistory = useCallback(async () => {
    try {
      await AsyncStorage.removeItem('chat_history');
      setSessions([]);
    } catch (e) {
      console.error('Failed to clear chat history', e);
    }
  }, []);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Chat History</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons
                name="close"
                size={20}
                color={isDark ? '#FFFFFF' : '#111111'}
              />
            </TouchableOpacity>
          </View>

          {sessions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="time-outline"
                size={40}
                color="#888888"
                style={{ marginBottom: 8 }}
              />
              <Text style={styles.emptyText}>No previous chats</Text>
            </View>
          ) : (
            <>
              <FlatList
                data={sessions}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => {
                  const firstUserMessage = item.messages.find(
                    (m) => m.user && m.user._id === 1
                  );
                  const title = firstUserMessage?.text || '(no message)';
                  const time = new Date(item.date).toLocaleTimeString(undefined, {
                    hour: 'numeric',
                    minute: '2-digit',
                  });
                  const meta = `${item.messages.length} messages \u00b7 ${time}`;

                  return (
                    <View style={styles.sessionBlock}>
                      <Text style={styles.dateLabel}>
                        {getDateLabel(item.date).toUpperCase()}
                      </Text>
                      <TouchableOpacity
                        style={styles.sessionCard}
                        activeOpacity={0.7}
                        onPress={() => {
                          onSelectSession(item.messages);
                          onClose();
                        }}
                      >
                        <View style={styles.sessionTextWrap}>
                          <Text
                            style={styles.sessionTitle}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {title}
                          </Text>
                          <Text style={styles.sessionMeta}>{meta}</Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color="#888888"
                        />
                      </TouchableOpacity>
                    </View>
                  );
                }}
              />

              <TouchableOpacity
                style={styles.clearBtn}
                activeOpacity={0.7}
                onPress={handleClearHistory}
              >
                <Text style={styles.clearText}>Clear History</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    sheet: {
      maxHeight: '80%',
      backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 24,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#000000',
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#2A2A2A' : '#E5E5EA',
    },
    listContent: {
      paddingBottom: 16,
    },
    sessionBlock: {
      marginBottom: 8,
    },
    dateLabel: {
      fontSize: 11,
      color: '#888888',
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    sessionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5',
      borderRadius: 12,
      padding: 14,
    },
    sessionTextWrap: {
      flex: 1,
      marginRight: 12,
    },
    sessionTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: isDark ? '#FFFFFF' : '#000000',
      marginBottom: 4,
    },
    sessionMeta: {
      fontSize: 12,
      color: '#888888',
    },
    clearBtn: {
      marginTop: 8,
      alignSelf: 'center',
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    clearText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FF4444',
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 32,
    },
    emptyText: {
      fontSize: 14,
      color: '#888888',
    },
  });
