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
  rehearsal: "#22C55E",
  service: "#A855F7",
  special: "#F59E0B",
  other: "#64748B",
};

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { data: feed, isLoading, refetch } = trpc.home.feed.useQuery();

  const featuredEvent = feed?.upcomingEvents?.[0];

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
      >
        <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.heroTop}>
            <View>
              <Text style={[styles.greeting, { color: colors.muted }]}>{getGreeting()}</Text>
              <Text style={[styles.heroTitle, { color: colors.foreground }]}>Stay connected.</Text>
              <Text style={[styles.heroTitleAccent, { color: colors.primary }]}>Stay plugged in.</Text>
            </View>
            <Image source={require("@/assets/images/icon.png")} style={styles.headerLogo} />
          </View>

          <Text style={[styles.heroSubtitle, { color: colors.muted }]}>
            Rehearsals, worship moments, members, songs, and updates — all in one place.
          </Text>

          {featuredEvent ? (
            <Pressable
              onPress={() => router.push(`/event/${featuredEvent.id}`)}
              style={({ pressed }) => [
                styles.featuredEvent,
                { backgroundColor: colors.primary + "16", borderColor: colors.primary + "35" },
                pressed && { opacity: 0.82 },
              ]}
            >
              <View style={styles.featuredEventTextWrap}>
                <Text style={[styles.featuredLabel, { color: colors.primary }]}>NEXT UP</Text>
                <Text style={[styles.featuredTitle, { color: colors.foreground }]} numberOfLines={1}>
                  {featuredEvent.title}
                </Text>
                <Text style={[styles.featuredMeta, { color: colors.muted }]}>
                  {formatDate(featuredEvent.date)}
                  {featuredEvent.location ? ` • ${featuredEvent.location}` : ""}
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={20} color={colors.primary} />
            </Pressable>
          ) : (
            <View style={[styles.featuredEvent, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "25" }]}>
              <View style={styles.featuredEventTextWrap}>
                <Text style={[styles.featuredLabel, { color: colors.primary }]}>THE PLUG</Text>
                <Text style={[styles.featuredTitle, { color: colors.foreground }]}>Ready for what’s next</Text>
                <Text style={[styles.featuredMeta, { color: colors.muted }]}>Upcoming rehearsals and events will appear here.</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>CALENDAR</Text>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Upcoming Events</Text>
            </View>
            <Pressable onPress={() => router.push("/(tabs)/events")} style={({ pressed }) => [styles.seeAllPill, { borderColor: colors.border }, pressed && { opacity: 0.6 }]}>
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
                    pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] },
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
                    <Text style={[styles.eventMetaText, { color: colors.muted }]}>{formatDate(event.date)}</Text>
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
            <PremiumEmptyCard
              colors={colors}
              icon="calendar"
              title="No upcoming events yet"
              subtitle="New rehearsals, services, and worship gatherings will show up here."
            />
          )}
        </View>

        <View style={styles.section}>
          <View>
            <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>DAILY RHYTHM</Text>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Daily Devotional</Text>
          </View>

          {feed?.latestDevotional ? (
            <Pressable
              onPress={() => router.push(`/devotional/${feed.latestDevotional!.id}`)}
              style={({ pressed }) => [
                styles.devotionalCard,
                { backgroundColor: colors.primary + "14", borderColor: colors.primary + "30" },
                pressed && { opacity: 0.8 },
              ]}
            >
              <View style={[styles.devotionalIcon, { backgroundColor: colors.primary + "20" }]}>
                <IconSymbol name="book.fill" size={24} color={colors.primary} />
              </View>

              <View style={styles.devotionalBody}>
                <Text style={[styles.devotionalTitle, { color: colors.foreground }]}>{feed.latestDevotional.title}</Text>

                {feed.latestDevotional.scriptureReference && (
                  <Text style={[styles.devotionalScripture, { color: colors.primary }]}>
                    {feed.latestDevotional.scriptureReference}
                  </Text>
                )}

                <Text style={[styles.devotionalPreview, { color: colors.muted }]} numberOfLines={2}>
                  {feed.latestDevotional.content}
                </Text>
              </View>
            </Pressable>
          ) : (
            <PremiumEmptyCard
              colors={colors}
              icon="book.fill"
              title="No devotional yet"
              subtitle="Daily encouragement and scriptures will appear here soon."
            />
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>GALLERY</Text>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Media</Text>
            </View>
            <Pressable onPress={() => router.push("/(tabs)/more")} style={({ pressed }) => [styles.seeAllPill, { borderColor: colors.border }, pressed && { opacity: 0.6 }]}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
            </Pressable>
          </View>

          {feed?.recentMedia && feed.recentMedia.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaRow}>
              {feed.recentMedia.map((item) => (
                <View key={item.id} style={[styles.mediaThumb, { backgroundColor: colors.surface }]}>
                  <Image source={{ uri: item.url }} style={styles.mediaImage} />
                </View>
              ))}
            </ScrollView>
          ) : (
            <PremiumEmptyCard
              colors={colors}
              icon="photo.fill"
              title="No media shared yet"
              subtitle="Photos, videos, and moments from The Plug will appear here."
            />
          )}
        </View>

        <View style={[styles.section, { marginBottom: 36 }]}>
          <View>
            <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>SHORTCUTS</Text>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Actions</Text>
          </View>

          <View style={styles.quickActions}>
            {[
              { icon: "calendar" as const, label: "Events", desc: "View schedule", route: "/(tabs)/events" },
              { icon: "music.note" as const, label: "Songs", desc: "Setlists & lyrics", route: "/(tabs)/songs" },
              { icon: "person.2.fill" as const, label: "Members", desc: "Directory", route: "/(tabs)/members" },
              { icon: "bubble.left.fill" as const, label: "More", desc: "Media & chat", route: "/(tabs)/more" },
            ].map((action) => (
              <Pressable
                key={action.label}
                onPress={() => router.push(action.route as any)}
                style={({ pressed }) => [
                  styles.quickActionItem,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  pressed && { opacity: 0.78, transform: [{ scale: 0.97 }] },
                ]}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: colors.primary + "18" }]}>
                  <IconSymbol name={action.icon} size={22} color={colors.primary} />
                </View>
                <View style={styles.quickActionTextWrap}>
                  <Text style={[styles.quickActionLabel, { color: colors.foreground }]}>{action.label}</Text>
                  <Text style={[styles.quickActionDesc, { color: colors.muted }]}>{action.desc}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function PremiumEmptyCard({
  colors,
  icon,
  title,
  subtitle,
}: {
  colors: ReturnType<typeof useColors>;
  icon: React.ComponentProps<typeof IconSymbol>["name"];
  title: string;
  subtitle: string;
}) {
  return (
    <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.emptyIconCircle, { backgroundColor: colors.primary + "14" }]}>
        <IconSymbol name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.emptySubtitle, { color: colors.muted }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
  },
  heroCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
    marginBottom: 30,
    overflow: "hidden",
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
  },
  greeting: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -1.1,
    lineHeight: 38,
  },
  heroTitleAccent: {
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -1.1,
    lineHeight: 38,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 14,
    marginBottom: 18,
    maxWidth: 330,
  },
  headerLogo: {
    width: 50,
    height: 50,
    borderRadius: 16,
  },
  featuredEvent: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  featuredEventTextWrap: {
    flex: 1,
  },
  featuredLabel: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.1,
    marginBottom: 4,
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  featuredMeta: {
    fontSize: 13,
    lineHeight: 18,
  },
  section: {
    marginBottom: 30,
    gap: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.3,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: "850",
    letterSpacing: -0.2,
  },
  seeAllPill: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: "800",
  },
  eventCarousel: {
    gap: 12,
    paddingRight: 4,
  },
  eventCard: {
    width: 214,
    minHeight: 150,
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    gap: 9,
    justifyContent: "space-between",
  },
  eventTypeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  eventTypeText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "capitalize",
  },
  eventTitle: {
    fontSize: 17,
    fontWeight: "850",
    lineHeight: 22,
  },
  eventMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  eventMetaText: {
    fontSize: 13,
    fontWeight: "500",
  },
  devotionalCard: {
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  devotionalIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  devotionalBody: {
    flex: 1,
    gap: 5,
  },
  devotionalTitle: {
    fontSize: 18,
    fontWeight: "850",
    lineHeight: 23,
  },
  devotionalScripture: {
    fontSize: 13,
    fontWeight: "800",
  },
  devotionalPreview: {
    fontSize: 14,
    lineHeight: 20,
  },
  mediaRow: {
    gap: 10,
  },
  mediaThumb: {
    width: 108,
    height: 108,
    borderRadius: 22,
    overflow: "hidden",
  },
  mediaImage: {
    width: "100%",
    height: "100%",
  },
  emptyCard: {
    padding: 22,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    gap: 8,
  },
  emptyIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "850",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    maxWidth: 280,
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickActionItem: {
    width: "48%",
    minHeight: 132,
    padding: 15,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: "space-between",
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  quickActionTextWrap: {
    gap: 3,
  },
  quickActionLabel: {
    fontSize: 15,
    fontWeight: "850",
  },
  quickActionDesc: {
    fontSize: 12,
    fontWeight: "600",
  },
});