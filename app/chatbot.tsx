import React, { useState, useCallback, useRef } from 'react';
import { 
  StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList, 
  KeyboardAvoidingView, Platform, ActivityIndicator, Modal, SafeAreaView, Keyboard, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSidebarControls } from '../components/AppSidebar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Markdown from 'react-native-markdown-display';

// 👇 FIX: Use "../" because 'lib' is just one folder up from 'app'
import { supabase } from '../lib/supabase'; 

import { useUnits } from '../contexts/UnitsContext';

const SERVER_URL = 'https://pocket-mechanic-brain.onrender.com/chat';

// --- Types ---
type Message = { id: string; role: 'user' | 'assistant' | 'system'; content: string; };
type Vehicle = { id: string; make: string; model: string; year: number; mileage: number; };

export default function ChatbotScreen() {
  const { unitSystem } = useUnits();
  const { toggle } = useSidebarControls();

  // --- State ---
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedCar, setSelectedCar] = useState<Vehicle | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // --- 1. Fetch ALL Cars ---
  useFocusEffect(
    useCallback(() => {
      const fetchGarage = async () => {
        console.log('Starting Garage Fetch...');
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            console.log('Fetching for User...');
            const { data, error } = await supabase
              .from('vehicles')
              .select('*')
              .eq('user_id', session.user.id);

            if (error) throw error;

            if (data && data.length > 0) {
              setVehicles(data);
              if (!selectedCar) setSelectedCar(data[0]);
            } else {
              setVehicles([]);
            }
          } else {
            console.log('Fetching for Guest...');
            const stored = await AsyncStorage.getItem('guest_garage');
            const parsed = stored ? JSON.parse(stored) : [];
            setVehicles(Array.isArray(parsed) ? parsed : []);
          }
        } catch (error) {
          console.log('Garage Error:', error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchGarage();
    }, [])
  );

  // --- 2. Send Message ---
  const sendMessage = async (textOverride?: string) => {
    const textToSend = textOverride ?? input;
    if (!textToSend.trim()) return;
    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Add a temporary "Thinking" bubble
    const loadingId = `loading-${Date.now()}`;
    setMessages(prev => [
      ...prev,
      { id: loadingId, role: 'assistant', content: 'Connecting to Brain...' }
    ]);

    try {
      console.log('🚀 ATTEMPTING FETCH TO:', SERVER_URL);
      console.log('Sending Units:', unitSystem);
      console.log('🚀 SENDING TO SERVER:', { message: userMessage, units: unitSystem });

      // 1. Force the fetch
      const response = await fetch(SERVER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // <--- Crucial!
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          message: userMessage.content,
          vehicle: selectedCar || null,
          carContext: selectedCar || null,
          units: unitSystem
        }),
      });
      // 2. Handle Network Errors
      if (!response.ok) {
        const errorData = await response.json(); // Read the explanation
        throw new Error(errorData.reply || `Server Error: ${response.status}`);
      }
      // 3. Get Data
      const data = await response.json();

      // 4. Remove "Thinking" and add Real Reply
      setMessages(prev => prev.filter(msg => msg.id !== loadingId));
      setMessages(prev => [
        ...prev,
        { id: Date.now().toString(), role: 'assistant', content: data.reply }
      ]);
    } catch (error) {
      console.error('❌ FETCH FAILED:', error);
      setMessages(prev => prev.filter(msg => msg.id !== loadingId));
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'system',
          content: `⚠️ DEAD END: ${error instanceof Error ? error.message : String(error)}\n(Target: ${SERVER_URL})`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 3. Sidebar Helper ---
  const toggleSidebar = () => {
    toggle();
  };

  const handleClearChat = () => {
    Alert.alert(
      'Start a new chat?',
      'This will clear current history.',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes', style: 'destructive', onPress: () => setMessages([]) }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* HEADER */}
      <View style={styles.header}>
        {/* Left: Sidebar Menu Button */}
        <TouchableOpacity onPress={toggleSidebar} style={styles.iconButton}>
          <Ionicons name="menu" size={28} color="#111" />
        </TouchableOpacity>

        {/* Center: Car Picker */}
        <TouchableOpacity style={styles.carSelector} onPress={() => setShowPicker(true)}>
          <Text style={styles.headerTitle}>Wrenchy AI</Text>
          <View style={styles.pickerRow}>
            <Text style={styles.carName}>
              {selectedCar ? `${selectedCar.year} ${selectedCar.model}` : 'Select Car'}
            </Text>
            <Ionicons name="chevron-down" size={14} color="#2563EB" />
          </View>
        </TouchableOpacity>

        {/* Right: New Chat (Clear) */}
        <TouchableOpacity onPress={handleClearChat} style={styles.iconButton}>
          <Ionicons name="refresh" size={22} color="#2563EB" />
        </TouchableOpacity>
      </View>

      {/* CAR PICKER MODAL */}
      <Modal visible={showPicker} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowPicker(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Vehicle</Text>
            {vehicles.map(car => (
              <TouchableOpacity key={car.id} style={styles.carOption} onPress={() => { setSelectedCar(car); setShowPicker(false); }}>
                <Text style={[styles.carOptionText, selectedCar?.id === car.id && styles.selectedText]}>
                  {car.year} {car.make} {car.model}
                </Text>
                {selectedCar?.id === car.id && <Ionicons name="checkmark" size={20} color="#2563EB" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* CHAT AREA */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        onTouchStart={() => Keyboard.dismiss()} // Dismiss keyboard on scroll
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.botBubble]}>
            <Markdown
              style={
                item.role === 'user'
                  ? { ...markdownStyles, body: { ...markdownStyles.body, color: '#FFFFFF' } }
                  : item.id === 'loading-placeholder'
                    ? { ...markdownStyles, body: { ...markdownStyles.body, color: '#777777', fontStyle: 'italic' } }
                    : markdownStyles
              }
            >
              {item.content}
            </Markdown>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="sparkles" size={48} color="#ddd" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyText}>
              How can I help with your <Text style={{fontWeight:'bold'}}>{selectedCar?.model || 'car'}</Text>?
            </Text>
            
            {/* SUGGESTION CHIPS */}
            <View style={styles.chipContainer}>
              {['Maintenance Schedule', 'Tire Pressure', 'Oil Change Interval', 'Check Engine Light'].map((suggestion) => (
                <TouchableOpacity 
                  key={suggestion} 
                  style={styles.chip} 
                  onPress={() => sendMessage(suggestion)}
                >
                  <Text style={styles.chipText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
      />

      {/* INPUT */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={10}>
        <View style={styles.inputContainer}>
          <TextInput 
            style={styles.input} 
            value={input} 
            onChangeText={setInput} 
            placeholder="Ask a question..." 
            placeholderTextColor="#999"
          />
          <TouchableOpacity style={styles.sendBtn} onPress={() => sendMessage()} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="white" /> : <Ionicons name="arrow-up" size={20} color="white" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    backgroundColor: 'white', 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    borderBottomWidth: 1, 
    borderColor: '#eee' 
  },
  iconButton: { padding: 4 },
  carSelector: { alignItems: 'center' },
  headerTitle: { fontSize: 10, color: '#888', fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' },
  pickerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  carName: { fontSize: 16, fontWeight: '700', color: '#111', marginRight: 4 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: 'white', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  carOption: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  carOptionText: { fontSize: 16, color: '#444' },
  selectedText: { color: '#2563EB', fontWeight: 'bold' },

  bubble: { maxWidth: '85%', padding: 14, borderRadius: 18, marginBottom: 12 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#2563EB', borderBottomRightRadius: 2 },
  botBubble: { alignSelf: 'flex-start', backgroundColor: 'white', borderBottomLeftRadius: 2, borderWidth: 1, borderColor: '#eee' },
  text: { fontSize: 15, lineHeight: 22 },
  userText: { color: 'white' },
  botText: { color: '#333' },
  thinkingText: { color: '#777', fontStyle: 'italic' },
  
  inputContainer: { flexDirection: 'row', padding: 12, backgroundColor: 'white', borderTopWidth: 1, borderColor: '#eee' },
  input: { flex: 1, backgroundColor: '#F0F2F5', borderRadius: 24, paddingHorizontal: 16, fontSize: 16, marginRight: 8, height: 44 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center' },
  
  emptyState: { alignItems: 'center', marginTop: 40, paddingHorizontal: 20 },
  emptyText: { color: '#888', fontSize: 16, marginBottom: 30, textAlign: 'center' },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  chip: { backgroundColor: 'white', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#eee', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  chipText: { color: '#2563EB', fontWeight: '500', fontSize: 14 }
});

const markdownStyles: any = {
  body: { fontSize: 16, color: '#333333' },
  heading1: { fontSize: 24, color: '#007AFF', fontWeight: 'bold', marginVertical: 10 },
  heading2: { fontSize: 20, color: '#007AFF', fontWeight: '600', marginVertical: 8 },
  strong: { fontWeight: '900', color: '#000000' },
  code_inline: { backgroundColor: '#f4f4f4', padding: 4, borderRadius: 4, fontFamily: 'Courier' },
  bullet_list: { marginVertical: 8 }
};