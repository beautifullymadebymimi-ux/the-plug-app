import { ScrollView, Text, View, Pressable, StyleSheet, Image, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { IconSymbol } from "@/components/ui/icon-symbol";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(dateStr: string | Date): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

const eventTypeColors: Record<string, string> = {
  rehearsal: "#3B82F6",
  service: "#8B5CF6",
  special: "#F59E0B",
  other: "#6B7280",
};

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();

  const { data: feed, isLoading, refetch } = trpc.home.feed.useQuery();

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.muted }]}>{getGreeting()}</Text>
            <Text style={[styles.userName, { color: colors.foreground }]}>
              Welcome to The Plug
            </Text>
          </View>
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.headerLogo}
          />
        </View>

        {/* Upcoming Events */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Upcoming Events</Text>
            <Pressable
              onPress={() => router.push("/(tabs)/events")}
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            >
              <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
            </Pressable>
          </View>
          {feed?.upcomingEvents && feed.upcomingEvents.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventCarousel}>
              {feed.upcomingEvents.map((event) => (
                <Pressable
                  key={event.id}
                  onPress={() => router.push(`/event/${event.id}`)}
                  style={({ pressed }) => [
                    styles.eventCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <View style={[styles.eventTypeBadge, { backgroundColor: eventTypeColors[event.type] || eventTypeColors.other }]}>
                    <Text style={styles.eventTypeText}>{event.type}</Text>
                  </View>
                  <Text style={[styles.eventTitle, { color: colors.foreground }]} numberOfLines={2}>
                    {event.title}
                  </Text>
                  <View style={styles.eventMeta}>
                    <IconSymbol name="clock" size={14} color={colors.muted} />
                    <Text style={[styles.eventMetaText, { color: colors.muted }]}>
                      {formatDate(event.date)}
                    </Text>
                  </View>
                  {event.location && (
                    <View style={styles.eventMeta}>
                      <IconSymbol name="mappin" size={14} color={colors.muted} />
                      <Text style={[styles.eventMetaText, { color: colors.muted }]} numberOfLines={1}>
                        {event.location}
                      </Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <IconSymbol name="calendar" size={32} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>No upcoming events</Text>
            </View>
          )}
        </View>

        {/* Daily Devotional */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Daily Devotional</Text>
          {feed?.latestDevotional ? (
            <Pressable
              onPress={() => router.push(`/devotional/${feed.latestDevotional!.id}`)}
              style={({ pressed }) => [
                styles.devotionalCard,
                { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" },
                pressed && { opacity: 0.7 },
              ]}
            >
              <IconSymbol name="book.fill" size={24} color={colors.primary} />
              <Text style={[styles.devotionalTitle, { color: colors.foreground }]}>
                {feed.latestDevotional.title}
              </Text>
              {feed.latestDevotional.scriptureReference && (
                <Text style={[styles.devotionalScripture, { color: colors.primary }]}>
                  {feed.latestDevotional.scriptureReference}
                </Text>
              )}
              <Text style={[styles.devotionalPreview, { color: colors.muted }]} numberOfLines={2}>
                {feed.latestDevotional.content}
              </Text>
            </Pressable>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <IconSymbol name="book.fill" size={32} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>No devotionals yet</Text>
            </View>
          )}
        </View>

        {/* Recent Media */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Media</Text>
            <Pressable
              onPress={() => router.push("/(tabs)/more")}
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            >
              <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
            </Pressable>
          </View>
          {feed?.recentMedia && feed.recentMedia.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaRow}>
              {feed.recentMedia.map((item) => (
                <View key={item.id} style={styles.mediaThumb}>
                  <Image source={{ uri: item.url }} style={[styles.mediaImage, { backgroundColor: colors.surface }]} />
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <IconSymbol name="photo.fill" size={32} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>No media shared yet</Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={[styles.section, { marginBottom: 32 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Actions</Text>
          <View style={styles.quickActions}>
            {[
              { icon: "calendar" as const, label: "Events", route: "/(tabs)/events" },
              { icon: "music.note" as const, label: "Songs", route: "/(tabs)/songs" },
              { icon: "person.2.fill" as const, label: "Members", route: "/(tabs)/members" },
              { icon: "bubble.left.fill" as const, label: "Chat", route: "/(tabs)/more" },
            ].map((action) => (
              <Pressable
                key={action.label}
                onPress={() => router.push(action.route as any)}
                style={({ pressed }) => [
                  styles.quickActionItem,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] },
                ]}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: colors.primary + "20" }]}>
                  <IconSymbol name={action.icon} size={22} color={colors.primary} />
                </View>
                <Text style={[styles.quickActionLabel, { color: colors.foreground }]}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 28 },
  greeting: { fontSize: 15, fontWeight: "500" },
  userName: { fontSize: 28, fontWeight: "800", marginTop: 2 },
  headerLogo: { width: 44, height: 44, borderRadius: 12 },
  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle: { fontSize: 20, fontWeight: "700" },
  seeAll: { fontSize: 14, fontWeight: "600" },
  eventCarousel: { gap: 12, paddingRight: 4 },
  eventCard: { width: 200, padding: 16, borderRadius: 16, borderWidth: 1, gap: 8 },
  eventTypeBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  eventTypeText: { color: "#FFF", fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  eventTitle: { fontSize: 16, fontWeight: "700", lineHeight: 22 },
  eventMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  eventMetaText: { fontSize: 13 },
  devotionalCard: { padding: 20, borderRadius: 16, borderWidth: 1, gap: 8 },
  devotionalTitle: { fontSize: 18, fontWeight: "700" },
  devotionalScripture: { fontSize: 14, fontWeight: "600" },
  devotionalPreview: { fontSize: 14, lineHeight: 20 },
  mediaRow: { gap: 8 },
  mediaThumb: { width: 100, height: 100, borderRadius: 12, overflow: "hidden" },
  mediaImage: { width: "100%", height: "100%", borderRadius: 12 },
  emptyCard: { padding: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", gap: 8 },
  emptyText: { fontSize: 14 },
  quickActions: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  quickActionItem: { width: "47%", padding: 16, borderRadius: 16, borderWidth: 1, alignItems: "center", gap: 10 },
  quickActionIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center" },
  quickActionLabel: { fontSize: 14, fontWeight: "600" },
});
