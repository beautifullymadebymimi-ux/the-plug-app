import { ScrollView, StyleSheet, Text, View, Pressable, Linking } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

export default function PrivacyScreen() {
  const colors = useColors();

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.kicker, { color: colors.primary }]}>PRIVACY</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Privacy Policy</Text>
          <Text style={[styles.updated, { color: colors.muted }]}>Last updated: June 4, 2026</Text>

          <Section title="Overview" colors={colors}>
            The Plug Worship helps approved members of The Plug organization stay connected through events,
            songs, setlists, devotionals, chat, notifications, member information, and ministry updates.
          </Section>

          <Section title="Information We Collect" colors={colors}>
            We may collect account information such as name, email address, login details, profile photo,
            worship role, event responses, chat messages, devotional activity, and app usage related to
            worship team participation.
          </Section>

          <Section title="How We Use Information" colors={colors}>
            We use information to provide app access, display worship team content, manage events,
            support communication, send notifications, maintain member profiles, and improve the app experience.
          </Section>

          <Section title="Push Notifications" colors={colors}>
            If you allow notifications, The Plug Worship may send push notifications for updates such as
            chat messages, devotionals, events, songs, or ministry-related announcements.
          </Section>

          <Section title="Data Sharing" colors={colors}>
            We do not sell personal information. Information may be shared only as needed to operate the app,
            provide services, maintain security, comply with legal obligations, or support authorized app administration.
          </Section>

          <Section title="Account Deletion" colors={colors}>
            Members can delete their account inside the app through Profile or Settings &gt; Delete Account.
          </Section>

          <View style={styles.section}>
            <Text style={[styles.heading, { color: colors.foreground }]}>Contact</Text>
            <Text style={[styles.body, { color: colors.muted }]}>
              For privacy questions or support, contact:
            </Text>
            <Pressable onPress={() => Linking.openURL("mailto:support@theplugworship.com")}>
              <Text style={[styles.link, { color: colors.primary }]}>support@theplugworship.com</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function Section({ title, children, colors }: any) {
  return (
    <View style={styles.section}>
      <Text style={[styles.heading, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.body, { color: colors.muted }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 22,
    paddingBottom: 50,
  },
  card: {
    borderWidth: 1,
    borderRadius: 26,
    padding: 22,
  },
  kicker: {
    fontSize: 13,
    fontWeight: "950",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  title: {
    fontSize: 34,
    fontWeight: "950",
    lineHeight: 38,
    marginBottom: 6,
  },
  updated: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 14,
  },
  section: {
    marginTop: 24,
    gap: 8,
  },
  heading: {
    fontSize: 20,
    fontWeight: "900",
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "600",
  },
  link: {
    fontSize: 16,
    fontWeight: "900",
  },
});
