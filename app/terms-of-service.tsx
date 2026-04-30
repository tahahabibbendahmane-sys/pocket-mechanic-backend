import { StyleSheet, View, Text, ScrollView, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

const BLUE = '#0567A6';

const SECTIONS = [
  {
    heading: 'Acceptance of Terms',
    body: 'By using Pocket Mechanic, you agree to these Terms of Service. If you do not agree, please do not use the app. We reserve the right to update these terms at any time with notice provided through the app.',
  },
  {
    heading: 'Use of the App',
    body: 'Pocket Mechanic is intended for personal, non-commercial use. You agree not to misuse the app, attempt to access other users\u2019 data, reverse engineer any part of the service, or use the app for any unlawful purpose.',
  },
  {
    heading: 'AI Mechanic Disclaimer',
    body: 'The AI Mechanic feature provides general automotive information and guidance only. It is not a substitute for professional mechanical advice. Always consult a certified mechanic for safety-critical repairs. Pocket Mechanic is not liable for any damage resulting from following AI-generated advice.',
  },
  {
    heading: 'DIY Repair Guides Disclaimer',
    body: 'DIY repair guides are provided for informational purposes only. Automotive repairs carry inherent risks. Always follow proper safety procedures, use appropriate tools, and consult a professional when in doubt. Pocket Mechanic assumes no responsibility for injuries or vehicle damage resulting from DIY repairs.',
  },
  {
    heading: 'Account Responsibility',
    body: 'You are responsible for maintaining the confidentiality of your account credentials. You are responsible for all activity that occurs under your account. Notify us immediately of any unauthorized use.',
  },
  {
    heading: 'Limitation of Liability',
    body: 'To the fullest extent permitted by law, Pocket Mechanic shall not be liable for any indirect, incidental, or consequential damages arising from your use of the app.',
  },
  {
    heading: 'Termination',
    body: 'We reserve the right to suspend or terminate accounts that violate these terms. You may delete your account at any time through the Settings screen.',
  },
  {
    heading: 'Contact Us',
    body: 'For questions about these Terms of Service, contact us at legal@pocketmechanic.app',
  },
];

export default function TermsOfServiceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { t } = useLanguage();

  const bg = isDark ? '#0D0D0D' : '#F2F2F7';
  const surface = isDark ? '#0D0D0D' : '#FFFFFF';
  const border = isDark ? '#2A2A2A' : '#E5E5EA';
  const textPrimary = isDark ? '#FFFFFF' : '#000000';
  const textBody = isDark ? '#888888' : '#6C6C70';
  const textDim = isDark ? '#555555' : '#AEAEB2';

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={bg} />

      <View style={[styles.header, { backgroundColor: surface, borderBottomColor: border, paddingTop: Platform.OS === 'ios' ? insets.top + 4 : 16 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={BLUE} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>{t.settings.termsOfService}</Text>
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
