import { StyleSheet, View, Text, ScrollView, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/contexts/LanguageContext';
import { COLORS } from '@/constants/DesignSystem';

const BLUE = '#0567A6';

const SECTIONS = [
  {
    heading: 'Information We Collect',
    body: 'We collect information you provide when creating an account, including your name and email address. We also collect vehicle data you enter such as make, model, year, and mileage, as well as maintenance records and service history you log within the app.',
  },
  {
    heading: 'How We Use Your Information',
    body: 'Your information is used solely to provide and improve the Pocket Mechanic experience. Vehicle data powers your personalized maintenance reminders, health score, and AI mechanic recommendations. We do not sell your personal data to third parties.',
  },
  {
    heading: 'Data Storage & Security',
    body: 'Your data is securely stored using Supabase, which employs industry-standard encryption. Vehicle and maintenance data is associated with your account and is not shared with other users.',
  },
  {
    heading: 'AI Chat Data',
    body: 'Questions you ask the AI mechanic are sent to our AI provider to generate responses. These queries may include your vehicle details for context. We recommend avoiding sharing sensitive personal information in chat.',
  },
  {
    heading: 'Third-Party Services',
    body: 'Pocket Mechanic uses the following third-party services: Supabase (database and authentication), DeepSeek AI (AI chat responses), and Expo (app framework). Each service has its own privacy policy.',
  },
  {
    heading: 'Your Rights',
    body: 'You may request deletion of your account and associated data at any time by contacting us. Upon deletion, all personal data and vehicle records are permanently removed from our servers.',
  },
  {
    heading: 'Contact Us',
    body: 'If you have questions about this Privacy Policy, please contact us at privacy@pocketmechanic.app',
  },
];

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const bg = COLORS.surface;
  const surface = COLORS.background;
  const border = COLORS.border;
  const textPrimary = COLORS.text;
  const textBody = COLORS.textMuted;
  const textDim = COLORS.textLight;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle="dark-content" backgroundColor={bg} />

      <View style={[styles.header, { backgroundColor: surface, borderBottomColor: border, paddingTop: Platform.OS === 'ios' ? insets.top + 4 : 16 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={BLUE} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>{t.settings.privacyPolicy}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.updated, { color: textDim }]}>Last updated: March 1, 2026</Text>

        {SECTIONS.map((section, idx) => (
          <View key={section.heading}>
            <Text style={[styles.sectionHeading, { color: textPrimary }, idx === 0 && { marginTop: 0 }]}>
              {section.heading}
            </Text>
            <Text style={[styles.body, { color: textBody }]}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center', flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },
  updated: { fontSize: 12, marginBottom: 24 },
  sectionHeading: { fontSize: 16, fontWeight: '600', marginBottom: 8, marginTop: 24 },
  body: { fontSize: 14, lineHeight: 22 },
});
