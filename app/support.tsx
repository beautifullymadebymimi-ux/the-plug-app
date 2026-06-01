import { ScrollView, Text, View, StyleSheet, Pressable, Linking } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

export default function SupportScreen() {
  const colors = useColors();

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: colors.foreground }]}>Support</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Need help with The Plug Worship? We are here to help.
        </Text>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.heading, { color: colors.foreground }]}>Contact Support</Text>
          <Text style={[styles.body, { color: colors.muted }]}>
            For help with login, app access, events, songs, setlists, notifications, or your member profile,
            contact support.
          </Text>

          <Pressable
            onPress={() => Linking.openURL("mailto:support@theplugworship.com")}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.buttonText}>Email Support</Text>
          </Pressable>

          <Text style={[styles.email, { color: colors.muted }]}>support@theplugworship.com</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 30, fontWeight: "950", marginBottom: 6 },
  subtitle: { fontSize: 15, lineHeight: 22, fontWeight: "600", marginBottom: 18 },
  card: { borderWidth: 1, borderRadius: 22, padding: 18, gap: 12 },
  heading: { fontSize: 18, fontWeight: "900" },
  body: { fontSize: 14, lineHeight: 21, fontWeight: "500" },
  button: { paddingVertical: 14, borderRadius: 16, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#FFF", fontSize: 15, fontWeight: "900" },
  email: { fontSize: 13, fontWeight: "700", textAlign: "center" },
});
