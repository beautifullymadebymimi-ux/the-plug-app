import {
  Text,
  View,
  FlatList,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { IconSymbol } from "@/components/ui/icon-symbol";
import * as Haptics from "expo-haptics";

const TOTAL_FEE_CENTS = 15000;

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(dateStr: string | Date): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function PortalScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const totalQuery = trpc.payments.myTotal.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const paymentsQuery = trpc.payments.myPayments.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const handleCashAppPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const cashAppUrl = "https://cash.app/$theplugworship";
    Linking.openURL(cashAppUrl).catch(() => {
      Alert.alert("Cash App", "Send payment to $theplugworship on Cash App");
    });
  };

  if (authLoading) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>Loading portal...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!isAuthenticated) {
    return (
      <ScreenContainer>
        <View style={styles.loginGate}>
          <View style={[styles.loginCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.loginIconCircle, { backgroundColor: colors.primary + "18" }]}>
              <IconSymbol name="person.crop.circle" size={58} color={colors.primary} />
            </View>

            <Text style={[styles.loginTitle, { color: colors.foreground }]}>Member Portal</Text>

            <Text style={[styles.loginSubtitle, { color: colors.muted }]}>
              Sign in to view your membership status, payment progress, and member tools.
            </Text>

            <Pressable
              onPress={() => router.push("/auth")}
              style={({ pressed }) => [
                styles.loginButton,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
              ]}
            >
              <Text style={styles.loginButtonText}>Sign In</Text>
            </Pressable>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  const totalData = totalQuery.data;
  const payments = paymentsQuery.data || [];
  const isLoading = totalQuery.isLoading || paymentsQuery.isLoading;

  const totalPaid = totalData?.totalPaid || 0;
  const remaining = totalData?.remaining ?? TOTAL_FEE_CENTS;
  const isPaidInFull = !!totalData?.isPaidInFull;
  const progressPercent = totalData
    ? Math.min((totalData.totalPaid / totalData.totalDue) * 100, 100)
    : 0;

  const renderPaymentItem = ({ item, index }: { item: any; index: number }) => (
    <View style={styles.timelineRow}>
      <View style={styles.timelineRail}>
        <View style={[styles.timelineDot, { backgroundColor: colors.primary }]} />
        {index !== payments.length - 1 && (
          <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
        )}
      </View>

      <View style={[styles.paymentRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.paymentRowTop}>
          <Text style={[styles.paymentAmount, { color: colors.foreground }]}>
            {formatCents(item.amount)}
          </Text>
          <Text style={[styles.paymentDate, { color: colors.muted }]}>
            {formatDate(item.createdAt)}
          </Text>
        </View>

        <View style={styles.paymentRowBottom}>
          <Text style={[styles.paymentNote, { color: colors.muted }]} numberOfLines={1}>
            {item.note || "Membership payment"}
          </Text>

          {item.paymentMethod && (
            <View style={[styles.methodPill, { backgroundColor: colors.primary + "14" }]}>
              <Text style={[styles.methodPillText, { color: colors.primary }]}>
                {item.paymentMethod === "cash_app" ? "Cash App" : item.paymentMethod}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  const ListHeader = () => (
    <View style={styles.headerContainer}>
      <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.heroTop}>
          <View style={styles.heroText}>
            <Text style={[styles.heroEyebrow, { color: colors.primary }]}>MEMBER PORTAL</Text>
            <Text style={[styles.heroTitle, { color: colors.foreground }]}>
              Welcome back, {user?.name?.split(" ")[0] || "Member"}.
            </Text>
            <Text style={[styles.heroSubtitle, { color: colors.muted }]}>
              You’re plugged in. Track your membership, payments, and admin tools from one place.
            </Text>
          </View>

          <View style={[styles.memberBadge, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "30" }]}>
            <IconSymbol
              name={user?.role === "admin" ? "shield.fill" : "person.fill"}
              size={24}
              color={colors.primary}
            />
          </View>
        </View>

        <View style={styles.heroStatsRow}>
          <View style={[styles.heroStatPill, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.heroStatLabel, { color: colors.muted }]}>Role</Text>
            <Text style={[styles.heroStatValue, { color: colors.foreground }]}>
              {user?.role === "admin" ? "Admin" : "Member"}
            </Text>
          </View>

          <View style={[styles.heroStatPill, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.heroStatLabel, { color: colors.muted }]}>Status</Text>
            <Text style={[styles.heroStatValue, { color: isPaidInFull ? colors.success : colors.primary }]}>
              {isPaidInFull ? "Paid" : "Active"}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.progressHeader}>
          <View>
            <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>MEMBERSHIP</Text>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Fee Progress</Text>
          </View>

          {isPaidInFull ? (
            <View style={[styles.statusBadge, { backgroundColor: colors.success + "18" }]}>
              <IconSymbol name="checkmark.circle.fill" size={14} color={colors.success} />
              <Text style={[styles.statusBadgeText, { color: colors.success }]}>Paid in Full</Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, { backgroundColor: colors.primary + "18" }]}>
              <Text style={[styles.statusBadgeText, { color: colors.primary }]}>In Progress</Text>
            </View>
          )}
        </View>

        {isLoading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 22 }} />
        ) : (
          <>
            <View style={styles.bigAmountRow}>
              <View>
                <Text style={[styles.bigAmountLabel, { color: colors.muted }]}>Paid so far</Text>
                <Text style={[styles.bigAmount, { color: colors.primary }]}>{formatCents(totalPaid)}</Text>
              </View>

              <View style={styles.remainingBlock}>
                <Text style={[styles.remainingLabel, { color: colors.muted }]}>Remaining</Text>
                <Text style={[styles.remainingValue, { color: remaining === 0 ? colors.success : colors.foreground }]}>
                  {formatCents(remaining)}
                </Text>
              </View>
            </View>

            <View style={styles.progressArea}>
              <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: isPaidInFull ? colors.success : colors.primary,
                      width: `${progressPercent}%`,
                    },
                  ]}
                />
              </View>

              <View style={styles.progressFooter}>
                <Text style={[styles.progressText, { color: colors.muted }]}>
                  {Math.round(progressPercent)}% complete
                </Text>
                <Text style={[styles.progressText, { color: colors.muted }]}>
                  Total {formatCents(TOTAL_FEE_CENTS)}
                </Text>
              </View>
            </View>
          </>
        )}
      </View>

      <View style={[styles.payCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.payHeader}>
          <View style={[styles.payIcon, { backgroundColor: "#00D63220" }]}>
            <IconSymbol name="dollarsign.circle.fill" size={24} color="#00D632" />
          </View>

          <View style={styles.payHeaderText}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Payment Options</Text>
            <Text style={[styles.paySubtitle, { color: colors.muted }]}>
              Pay in full or split your membership fee into installments.
            </Text>
          </View>
        </View>

        <Pressable
          onPress={handleCashAppPress}
          style={({ pressed }) => [
            styles.cashAppButton,
            { backgroundColor: "#00D632" },
            pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
          ]}
        >
          <View>
            <Text style={styles.cashAppButtonText}>Pay with Cash App</Text>
            <Text style={styles.cashAppHandle}>$theplugworship</Text>
          </View>
          <IconSymbol name="arrow.up.right" size={20} color="#FFFFFF" />
        </Pressable>

        <View style={styles.installmentGrid}>
          <View style={[styles.installmentCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.installmentAmount, { color: colors.foreground }]}>$150</Text>
            <Text style={[styles.installmentLabel, { color: colors.muted }]}>Pay in Full</Text>
          </View>

          <View style={[styles.installmentCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.installmentAmount, { color: colors.foreground }]}>3 × $50</Text>
            <Text style={[styles.installmentLabel, { color: colors.muted }]}>Monthly Plan</Text>
          </View>
        </View>
      </View>

      {user && user.role === "admin" && (
        <View style={styles.adminSection}>
          <View>
            <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>ADMIN</Text>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Admin Console</Text>
          </View>

          <View style={styles.adminGrid}>
            <Pressable
              onPress={() => router.push("/admin/payments" as any)}
              style={({ pressed }) => [
                styles.adminCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                pressed && { opacity: 0.78, transform: [{ scale: 0.98 }] },
              ]}
            >
              <View style={[styles.adminIcon, { backgroundColor: colors.primary + "18" }]}>
                <IconSymbol name="dollarsign.circle.fill" size={22} color={colors.primary} />
              </View>
              <Text style={[styles.adminTitle, { color: colors.foreground }]}>Payments</Text>
              <Text style={[styles.adminDesc, { color: colors.muted }]}>Record and manage member payments.</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/admin/users" as any)}
              style={({ pressed }) => [
                styles.adminCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                pressed && { opacity: 0.78, transform: [{ scale: 0.98 }] },
              ]}
            >
              <View style={[styles.adminIcon, { backgroundColor: colors.primary + "18" }]}>
                <IconSymbol name="shield.fill" size={22} color={colors.primary} />
              </View>
              <Text style={[styles.adminTitle, { color: colors.foreground }]}>Users</Text>
              <Text style={[styles.adminDesc, { color: colors.muted }]}>Promote, deactivate, and manage access.</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.historyHeader}>
        <View>
          <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>HISTORY</Text>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Payment Timeline</Text>
        </View>

        <View style={[styles.countPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.countPillText, { color: colors.muted }]}>
            {payments.length} {payments.length === 1 ? "payment" : "payments"}
          </Text>
        </View>
      </View>
    </View>
  );

  const ListEmpty = () => (
    <View style={[styles.emptyContainer, { borderColor: colors.border }]}>
      <View style={[styles.emptyIconCircle, { backgroundColor: colors.primary + "14" }]}>
        <IconSymbol name="doc.text.fill" size={32} color={colors.primary} />
      </View>

      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No payments recorded yet</Text>

      <Text style={[styles.emptySubtext, { color: colors.muted }]}>
        Once an admin records your payment, it will appear here as part of your member timeline.
      </Text>
    </View>
  );

  return (
    <ScreenContainer>
      <FlatList
        data={payments}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderPaymentItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "600",
  },

  loginGate: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  loginCard: {
    borderWidth: 1,
    borderRadius: 30,
    padding: 24,
    alignItems: "center",
    gap: 14,
  },
  loginIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  loginTitle: {
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.8,
    textAlign: "center",
  },
  loginSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    maxWidth: 320,
  },
  loginButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 4,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "850",
  },

  headerContainer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    gap: 18,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 30,
    padding: 20,
    gap: 18,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  heroText: {
    flex: 1,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -1,
    lineHeight: 34,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  memberBadge: {
    width: 54,
    height: 54,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  heroStatsRow: {
    flexDirection: "row",
    gap: 10,
  },
  heroStatPill: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
  },
  heroStatLabel: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  heroStatValue: {
    fontSize: 15,
    fontWeight: "850",
  },

  progressCard: {
    borderWidth: 1,
    borderRadius: 30,
    padding: 20,
    gap: 18,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
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
    letterSpacing: -0.3,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "850",
  },
  bigAmountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 16,
  },
  bigAmountLabel: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  bigAmount: {
    fontSize: 38,
    fontWeight: "950",
    letterSpacing: -1.2,
  },
  remainingBlock: {
    alignItems: "flex-end",
    paddingBottom: 4,
  },
  remainingLabel: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  remainingValue: {
    fontSize: 22,
    fontWeight: "900",
  },
  progressArea: {
    gap: 8,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  progressFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressText: {
    fontSize: 12,
    fontWeight: "700",
  },

  payCard: {
    borderWidth: 1,
    borderRadius: 30,
    padding: 20,
    gap: 16,
  },
  payHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  payIcon: {
    width: 52,
    height: 52,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  payHeaderText: {
    flex: 1,
    gap: 4,
  },
  paySubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  cashAppButton: {
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cashAppButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  cashAppHandle: {
    color: "rgba(255,255,255,0.86)",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  installmentGrid: {
    flexDirection: "row",
    gap: 10,
  },
  installmentCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    alignItems: "center",
  },
  installmentAmount: {
    fontSize: 20,
    fontWeight: "900",
  },
  installmentLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },

  adminSection: {
    gap: 14,
  },
  adminGrid: {
    flexDirection: "row",
    gap: 12,
  },
  adminCard: {
    flex: 1,
    minHeight: 150,
    borderWidth: 1,
    borderRadius: 24,
    padding: 15,
    justifyContent: "space-between",
  },
  adminIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  adminTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  adminDesc: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },

  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
    marginTop: 2,
  },
  countPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  countPillText: {
    fontSize: 12,
    fontWeight: "800",
  },

  listContent: {
    paddingBottom: 100,
  },
  timelineRow: {
    flexDirection: "row",
    paddingHorizontal: 18,
    gap: 12,
  },
  timelineRail: {
    width: 18,
    alignItems: "center",
    paddingTop: 18,
  },
  timelineDot: {
    width: 11,
    height: 11,
    borderRadius: 999,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 5,
  },
  paymentRow: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 22,
    padding: 15,
    marginBottom: 10,
    gap: 10,
  },
  paymentRowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 10,
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: "900",
  },
  paymentDate: {
    fontSize: 12,
    fontWeight: "700",
  },
  paymentRowBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    alignItems: "center",
  },
  paymentNote: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  methodPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  methodPillText: {
    fontSize: 11,
    fontWeight: "850",
    textTransform: "capitalize",
  },

  emptyContainer: {
    marginHorizontal: 18,
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 26,
    alignItems: "center",
    paddingVertical: 34,
    paddingHorizontal: 24,
    gap: 9,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    maxWidth: 300,
  },
});