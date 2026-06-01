import { ScrollView, Text, View, StyleSheet } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

export default function PrivacyPolicyScreen() {
  const colors = useColors();

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: colors.foreground }]}>Privacy Policy</Text>
        <Text style={[styles.updated, { color: colors.muted }]}>Last updated: June 1, 2026</Text>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.heading, { color: colors.foreground }]}>Overview</Text>
          <Text style={[styles.body, { color: colors.muted }]}>
            The Plug Worship is designed to help worship team members stay connected through events, songs,
            setlists, devotionals, chat, notifications, member information, and ministry updates.
          </Text>

          <Text style={[styles.heading, { color: colors.foreground }]}>Information We Collect</Text>
          <Text style={[styles.body, { color: colors.muted }]}>
            We may collect account information such as your name, email address, login details, profile photo,
            worship role, voice part, instrument, event responses, chat messages, devotional activity, and app
            usage related to worship team participation.
          </Text>

          <Text style={[styles.heading, { color: colors.foreground }]}>How We Use Information</Text>
          <Text style={[styles.body, { color: colors.muted }]}>
            We use information to provide app access, display worship team content, manage events, support group
            communication, send notifications, maintain member profiles, and improve the worship team experience.
          </Text>

          <Text style={[styles.heading, { color: colors.foreground }]}>Push Notifications</Text>
          <Text style={[styles.body, { color: colors.muted }]}>
            If you allow notifications, The Plug Worship may send push notifications for updates such as chat
            messages, devotionals, events, songs, or other ministry-related announcements. You can disable
            notifications through your device settings.
          </Text>

          <Text style={[styles.heading, { color: colors.foreground }]}>Data Sharing</Text>
          <Text style={[styles.body, { color: colors.muted }]}>
            We do not sell personal information. Information may be shared only as needed to operate the app,
            provide services, maintain security, comply with legal obligations, or support authorized worship
            team administration.
          </Text>

          <Text style={[styles.heading, { color: colors.foreground }]}>Data Security</Text>
          <Text style={[styles.body, { color: colors.muted }]}>
            We use reasonable safeguards to protect app data. However, no method of transmission or storage is
            completely secure, and we cannot guarantee absolute security.
          </Text>

          <Text style={[styles.heading, { color: colors.foreground }]}>Your Choices</Text>
          <Text style={[styles.body, { color: colors.muted }]}>
            You may request updates, corrections, or removal of your account information by contacting the app
            administrator.
          </Text>

          <Text style={[styles.heading, { color: colors.foreground }]}>Contact</Text>
          <Text style={[styles.body, { color: colors.muted }]}>
            For privacy questions or support, contact: support@theplugworship.com
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 30, fontWeight: "950", marginBottom: 6 },
  updated: { fontSize: 13, fontWeight: "700", marginBottom: 18 },
  card: { borderWidth: 1, borderRadius: 22, padding: 18, gap: 10 },
  heading: { fontSize: 17, fontWeight: "900", marginTop: 8 },
  body: { fontSize: 14, lineHeight: 21, fontWeight: "500" },
});
