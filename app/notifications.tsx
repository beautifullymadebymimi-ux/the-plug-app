import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";

export default function NotificationsScreen() {
  const colors = useColors();
  const notificationsQuery = trpc.notifications.list.useQuery();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const notifications = notificationsQuery.data || [];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: 20 }}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>
        Notifications
      </Text>

      {notifications.map((item: any) => (
        <View
          key={item.id}
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            {item.title}
          </Text>

          <Text style={[styles.cardMessage, { color: colors.muted }]}>
            {item.message}
          </Text>

          <Text style={[styles.cardDate, { color: colors.primary }]}>
            {mounted ? new Date(item.createdAt).toLocaleString() : ""}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 20,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  cardMessage: {
    fontSize: 15,
    marginBottom: 10,
  },
  cardDate: {
    fontSize: 12,
    fontWeight: "600",
  },
});
