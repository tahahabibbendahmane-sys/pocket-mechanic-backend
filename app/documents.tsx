import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import {
  getDocuments,
  uploadDocument,
  deleteDocument,
  StoredDocument,
} from '@/lib/documents';

const DOC_TYPES = [
  { key: 'Insurance', label: 'Insurance', icon: 'shield-checkmark-outline' },
  { key: "Driver's License", label: "Driver's License", icon: 'card-outline' },
  { key: 'Registration', label: 'Registration', icon: 'document-text-outline' },
];

export default function DocumentsScreen() {
  const router = useRouter();
  const { isDark } = useTheme();

  const bg = isDark ? '#0D0D0D' : '#F2F2F7';
  const card = isDark ? '#1A1A1A' : '#FFFFFF';
  const border = isDark ? '#2A2A2A' : '#E5E5E5';
  const textPrimary = isDark ? '#FFFFFF' : '#1A1A1A';
  const textSecondary = isDark ? '#888888' : '#666666';

  const [userId, setUserId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        loadDocuments(user.id);
      } else {
        setLoading(false);
      }
    });
  }, []);

  const loadDocuments = async (uid: string) => {
    setLoading(true);
    const docs = await getDocuments(uid);
    setDocuments(docs);
    setLoading(false);
  };

  const handleUpload = async (docType: string) => {
    if (!userId) return;
    setUploading(docType);
    const result = await uploadDocument(docType, userId);
    if (result) {
      setDocuments(prev => [result, ...prev.filter(d => d.type !== docType)]);
    } else {
      Alert.alert('Upload Failed', 'Could not upload document. Please try again.');
    }
    setUploading(null);
  };

  const handleDelete = (doc: StoredDocument) => {
    Alert.alert(
      'Delete Document',
      `Remove this ${doc.type} document?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteDocument(doc);
            if (success) {
              setDocuments(prev => prev.filter(d => d.id !== doc.id));
            } else {
              Alert.alert('Error', 'Could not delete document.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: 56,
          paddingHorizontal: 20,
          paddingBottom: 16,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="chevron-back" size={28} color={textPrimary} />
        </TouchableOpacity>
        <Text
          style={{
            color: textPrimary,
            fontSize: 20,
            fontFamily: 'Outfit_700Bold',
            flex: 1,
          }}
        >
          My Documents
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#0567A6" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, gap: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {DOC_TYPES.map(docType => {
            const existing = documents.find(d => d.type === docType.key);
            const isUploading = uploading === docType.key;

            return (
              <View
                key={docType.key}
                style={{
                  backgroundColor: card,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: border,
                  padding: 16,
                }}
              >
                {/* Card Header */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: existing ? 12 : 16,
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: '#0567A620',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name={docType.icon as any} size={18} color="#0567A6" />
                  </View>
                  <Text
                    style={{
                      color: textPrimary,
                      fontSize: 16,
                      fontFamily: 'Outfit_700Bold',
                      flex: 1,
                    }}
                  >
                    {docType.label}
                  </Text>
                  {existing && (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: '#2ECC7120',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 8,
                      }}
                    >
                      <Ionicons name="checkmark-circle" size={14} color="#2ECC71" />
                      <Text
                        style={{
                          color: '#2ECC71',
                          fontSize: 12,
                          fontFamily: 'Outfit_600SemiBold',
                        }}
                      >
                        Uploaded
                      </Text>
                    </View>
                  )}
                </View>

                {/* Document Preview */}
                {existing && (
                  <View style={{ marginBottom: 12 }}>
                    <Image
                      source={{ uri: existing.url }}
                      style={{
                        width: '100%',
                        height: 140,
                        borderRadius: 10,
                        backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0',
                      }}
                      resizeMode="cover"
                    />
                    <Text
                      style={{
                        color: textSecondary,
                        fontSize: 11,
                        marginTop: 6,
                      }}
                    >
                      Added{' '}
                      {new Date(existing.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => handleUpload(docType.key)}
                    disabled={isUploading}
                    style={{
                      flex: 1,
                      backgroundColor: '#0567A6',
                      borderRadius: 10,
                      paddingVertical: 12,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    {isUploading ? (
                      <ActivityIndicator size="small" color="#000000" />
                    ) : (
                      <>
                        <Ionicons
                          name={existing ? 'refresh-outline' : 'cloud-upload-outline'}
                          size={16}
                          color="#000000"
                        />
                        <Text
                          style={{
                            color: '#000000',
                            fontFamily: 'Outfit_700Bold',
                            fontSize: 14,
                          }}
                        >
                          {existing ? 'Replace' : 'Upload'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {existing && (
                    <TouchableOpacity
                      onPress={() => handleDelete(existing)}
                      style={{
                        width: 44,
                        backgroundColor: '#FF444420',
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#FF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
