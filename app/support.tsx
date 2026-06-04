import { ScrollView, StyleSheet, Text, View, Pressable, Linking } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

export default function SupportScreen() {
  const colors = useColors();

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.kicker, { color: colors.primary }]}>SUPPORT</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>The Plug Worship Support</Text>

          <Text style={[styles.body, { color: colors.muted }]}>
            The Plug Worship is a private app intended for approved members of The Plug organization.
            If you need help accessing or using the app, please contact support.
          </Text>

          <View style={styles.section}>
            <Text style={[styles.heading, { color: colors.foreground }]}>Support Email</Text>
            <Pressable onPress={() => Linking.openURL("mailto:support@theplugworship.com")}>
              <Text style={[styles.link, { color: colors.primary }]}>support@theplugworship.com</Text>
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={[styles.heading, { color: colors.foreground }]}>Help Topics</Text>
            <Text style={[styles.listItem, { color: colors.muted }]}>• Login access</Text>
            <Text style={[styles.listItem, { color: colors.muted }]}>• Account issues</Text>
            <Text style={[styles.listItem, { color: colors.muted }]}>• Technical problems</Text>
            <Text style={[styles.listItem, { color: colors.muted }]}>• Membership payment tracking</Text>
            <Text style={[styles.listItem, { color: colors.muted }]}>• General app questions</Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.heading, { color: colors.foreground }]}>Account Deletion</Text>
            <Text style={[styles.body, { color: colors.muted }]}>
              Members can delete their account inside the app through Profile or Settings &gt; Delete Account.
              The app will ask for confirmation before completing account deletion.
            </Text>
          </View>

          <Text style={[styles.footer, { color: colors.muted }]}>
            © 2026 The Plug Worship. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
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
    marginBottom: 14,
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "600",
  },
  section: {
    marginTop: 24,
    gap: 8,
  },
  heading: {
    fontSize: 20,
    fontWeight: "900",
  },
  link: {
    fontSize: 16,
    fontWeight: "900",
  },
  listItem: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "700",
  },
  footer: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 28,
    textAlign: "center",
  },
});
