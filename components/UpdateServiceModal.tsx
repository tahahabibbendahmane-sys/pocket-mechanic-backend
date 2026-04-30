import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function UpdateServiceModal({ visible, onClose, onSave, serviceName }: any) {
  const [mileage, setMileage] = useState('');
  const handleSave = () => {
    if (!mileage) return;
    onSave(parseInt(mileage));
    setMileage('');
    onClose();
  };
  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Update {serviceName}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#FFF" /></TouchableOpacity>
          </View>
          <Text style={styles.label}>Enter current mileage:</Text>
          <TextInput style={styles.input} placeholder="e.g. 125000" placeholderTextColor="#666" keyboardType="numeric" value={mileage} onChangeText={setMileage} autoFocus />
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}><Text style={styles.saveButtonText}>Save Record</Text></TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#1A1A1A', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, minHeight: 300 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  label: { color: '#AAA', marginBottom: 8 },
  input: { backgroundColor: '#333', color: '#FFF', padding: 16, borderRadius: 12, fontSize: 18, marginBottom: 20 },
  saveButton: { backgroundColor: '#2962FF', padding: 16, borderRadius: 12, alignItems: 'center' },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
