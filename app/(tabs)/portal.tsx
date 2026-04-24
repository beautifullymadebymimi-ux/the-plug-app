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

const TOTAL_FEE_CENTS = 15000; // $150.00

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(dateStr: string | Date): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function PortalScreen() {
  const colors = useColors();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
 

  // Only fetch payment data when authenticated
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
    // Try to open Cash App, fall back to web
    const cashAppUrl = "https://cash.app/$theplugworship";
    Linking.openURL(cashAppUrl).catch(() => {
      Alert.alert("Cash App", "Send payment to $theplugworship on Cash App");
    });
  };

  // Auth loading state
  if (authLoading) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  // Not authenticated — show login gate
  if (!isAuthenticated) {
    return (
      <ScreenContainer>
        <View style={styles.loginContainer}>
          <View style={styles.loginContent}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primary + "20" }]}>
              <IconSymbol name="person.crop.circle" size={64} color={colors.primary} />
            </View>
            <Text style={[styles.loginTitle, { color: colors.foreground }]}>
              Member Portal
            </Text>
            <Text style={[styles.loginSubtitle, { color: colors.muted }]}>
              Sign in to view your membership status, payment history, and manage your account.
            </Text>
            <Pressable
              onPress={() => router.push("/auth")}
              style={({ pressed }) => [
                styles.loginButton,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Text style={styles.loginButtonText}>Sign In</Text>
            </Pressable>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  // Authenticated — show portal dashboard
  const totalData = totalQuery.data;
  const payments = paymentsQuery.data || [];
  const isLoading = totalQuery.isLoading || paymentsQuery.isLoading;

  const progressPercent = totalData
    ? Math.min((totalData.totalPaid / totalData.totalDue) * 100, 100)
    : 0;

  const renderPaymentItem = ({ item }: { item: any }) => (
    <View style={[styles.paymentRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.paymentRowLeft}>
        <View style={[styles.paymentIcon, { backgroundColor: colors.primary + "20" }]}>
          <IconSymbol name="dollarsign.circle.fill" size={20} color={colors.primary} />
        </View>
        <View style={styles.paymentDetails}>
          <Text style={[styles.paymentAmount, { color: colors.foreground }]}>
            {formatCents(item.amount)}
          </Text>
          {item.note && (
            <Text style={[styles.paymentNote, { color: colors.muted }]} numberOfLines={1}>
              {item.note}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.paymentRowRight}>
        <Text style={[styles.paymentDate, { color: colors.muted }]}>
          {formatDate(item.createdAt)}
        </Text>
        {item.paymentMethod && (
          <Text style={[styles.paymentMethod, { color: colors.muted }]}>
            {item.paymentMethod === "cash_app" ? "Cash App" : item.paymentMethod}
          </Text>
        )}
      </View>
    </View>
  );

  const ListHeader = () => (
    <View style={styles.headerContainer}>
      {/* Greeting */}
      <View style={styles.greetingSection}>
        <Text style={[styles.greeting, { color: colors.muted }]}>Welcome back,</Text>
        <Text style={[styles.userName, { color: colors.foreground }]}>
          {user?.name || "Member"}
        </Text>
      </View>

      {/* Fee Status Card */}
      <View style={[styles.feeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.feeHeader}>
          <Text style={[styles.feeTitle, { color: colors.foreground }]}>Membership Fee</Text>
          {totalData?.isPaidInFull && (
            <View style={[styles.paidBadge, { backgroundColor: colors.success + "20" }]}>
              <IconSymbol name="checkmark.circle.fill" size={14} color={colors.success} />
              <Text style={[styles.paidBadgeText, { color: colors.success }]}>Paid</Text>
            </View>
          )}
        </View>

        {isLoading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          <>
            <View style={styles.amountRow}>
              <View style={styles.amountBlock}>
                <Text style={[styles.amountLabel, { color: colors.muted }]}>Paid</Text>
                <Text style={[styles.amountValue, { color: colors.primary }]}>
                  {formatCents(totalData?.totalPaid || 0)}
                </Text>
              </View>
              <View style={[styles.amountDivider, { backgroundColor: colors.border }]} />
              <View style={styles.amountBlock}>
                <Text style={[styles.amountLabel, { color: colors.muted }]}>Remaining</Text>
                <Text style={[styles.amountValue, { color: totalData?.remaining === 0 ? colors.success : colors.foreground }]}>
                  {formatCents(totalData?.remaining || TOTAL_FEE_CENTS)}
                </Text>
              </View>
              <View style={[styles.amountDivider, { backgroundColor: colors.border }]} />
              <View style={styles.amountBlock}>
                <Text style={[styles.amountLabel, { color: colors.muted }]}>Total</Text>
                <Text style={[styles.amountValue, { color: colors.foreground }]}>
                  {formatCents(TOTAL_FEE_CENTS)}
                </Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: totalData?.isPaidInFull ? colors.success : colors.primary,
                      width: `${progressPercent}%`,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressText, { color: colors.muted }]}>
                {Math.round(progressPercent)}% complete
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Payment Options Card */}
      <View style={[styles.paymentOptionsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>How to Pay</Text>
        <Text style={[styles.paymentDescription, { color: colors.muted }]}>
          Send your membership fee via Cash App. You can pay the full $150 or split it into 3 monthly installments of $50.
        </Text>

        <Pressable
          onPress={handleCashAppPress}
          style={({ pressed }) => [
            styles.cashAppButton,
            { backgroundColor: "#00D632" },
            pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
          ]}
        >
          <Text style={styles.cashAppButtonText}>Pay with Cash App</Text>
          <Text style={styles.cashAppHandle}>$theplugworship</Text>
        </Pressable>

        <View style={styles.paymentOptionsRow}>
          <View style={[styles.optionCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.optionAmount, { color: colors.primary }]}>$150</Text>
            <Text style={[styles.optionLabel, { color: colors.muted }]}>Pay in Full</Text>
          </View>
          <Text style={[styles.orText, { color: colors.muted }]}>or</Text>
          <View style={[styles.optionCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.optionAmount, { color: colors.primary }]}>3 x $50</Text>
            <Text style={[styles.optionLabel, { color: colors.muted }]}>Monthly</Text>
          </View>
        </View>
      </View>

      {/* Admin Links */}
      {user && user.role === "admin" && (
        <View style={styles.adminLinksContainer}>
          <Pressable
            onPress={() => router.push("/admin/payments" as any)}
            style={({ pressed }) => [
              styles.adminButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && { opacity: 0.8 },
            ]}
          >
            <IconSymbol name="dollarsign.circle.fill" size={20} color={colors.primary} />
            <Text style={[styles.adminButtonText, { color: colors.foreground }]}>
              Manage Payments
            </Text>
            <IconSymbol name="chevron.right" size={16} color={colors.muted} />
          </Pressable>
          <Pressable
            onPress={() => router.push("/admin/users" as any)}
            style={({ pressed }) => [
              styles.adminButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && { opacity: 0.8 },
            ]}
          >
            <IconSymbol name="shield.fill" size={20} color={colors.primary} />
            <Text style={[styles.adminButtonText, { color: colors.foreground }]}>
              Manage Users
            </Text>
            <IconSymbol name="chevron.right" size={16} color={colors.muted} />
          </Pressable>
        </View>
      )}

      {/* Payment History Header */}
      <View style={styles.historyHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Payment History</Text>
        <Text style={[styles.historyCount, { color: colors.muted }]}>
          {payments.length} {payments.length === 1 ? "payment" : "payments"}
        </Text>
      </View>
    </View>
  );

  const ListEmpty = () => (
    <View style={styles.emptyContainer}>
      <IconSymbol name="doc.text.fill" size={40} color={colors.muted} />
      <Text style={[styles.emptyText, { color: colors.muted }]}>
        No payments recorded yet
      </Text>
      <Text style={[styles.emptySubtext, { color: colors.muted }]}>
        Once an admin records your payment, it will appear here.
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
  },
  // Login gate
  loginContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  loginContent: {
    alignItems: "center",
    gap: 16,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  loginSubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  loginButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: "center",
    marginTop: 12,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  // Dashboard
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 16,
  },
  greetingSection: {
    gap: 2,
  },
  greeting: {
    fontSize: 14,
    fontWeight: "500",
  },
  userName: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  // Fee Card
  feeCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  feeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  feeTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  paidBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  paidBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  amountBlock: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  amountDivider: {
    width: 1,
    height: 36,
  },
  progressContainer: {
    marginTop: 16,
    gap: 6,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "right",
  },
  // Payment Options
  paymentOptionsCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  paymentDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  cashAppButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  cashAppButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  cashAppHandle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontWeight: "600",
  },
  paymentOptionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 4,
  },
  optionCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  optionAmount: {
    fontSize: 20,
    fontWeight: "800",
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  orText: {
    fontSize: 13,
    fontWeight: "600",
  },
  // Admin button
  adminLinksContainer: {
    gap: 10,
  },
  adminButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  adminButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  // Payment History
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: 4,
  },
  historyCount: {
    fontSize: 13,
    fontWeight: "500",
  },
  listContent: {
    paddingBottom: 100,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  paymentRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  paymentIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  paymentDetails: {
    flex: 1,
    gap: 2,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: "700",
  },
  paymentNote: {
    fontSize: 13,
  },
  paymentRowRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  paymentDate: {
    fontSize: 13,
    fontWeight: "500",
  },
  paymentMethod: {
    fontSize: 11,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  // Empty state
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 4,
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
});
