import {
  Text,
  View,
  FlatList,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { IconSymbol } from "@/components/ui/icon-symbol";
import * as Haptics from "expo-haptics";
import { useState } from "react";

const TOTAL_FEE_CENTS = 10000;

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(dateStr: string | Date): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type PaymentAmount = 5000 | 10000;
type PaymentMethod = "cash_app" | "zelle" | "cash" | "other";

const AMOUNT_OPTIONS: { value: PaymentAmount; label: string }[] = [
  { value: 5000, label: "$50 — Installment" },
  { value: 10000, label: "$100 — Full Payment" },
];

const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "cash_app", label: "Cash App" },
  { value: "zelle", label: "Zelle" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
];

export default function AdminPaymentsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const [showModal, setShowModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<PaymentAmount>(5000);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("cash_app");
  const [note, setNote] = useState("");

  const summariesQuery = trpc.payments.allSummaries.useQuery(undefined, {
    enabled: isAuthenticated && (user as any)?.role === "admin",
  });

  const allPaymentsQuery = trpc.payments.allPayments.useQuery(undefined, {
    enabled: isAuthenticated && (user as any)?.role === "admin",
  });

  const recordMutation = trpc.payments.record.useMutation({
    onSuccess: () => {
      summariesQuery.refetch();
      allPaymentsQuery.refetch();
      setShowModal(false);
      resetForm();
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
    onError: (err) => {
      Alert.alert("Error", err.message || "Failed to record payment");
    },
  });

  const deleteMutation = trpc.payments.delete.useMutation({
    onSuccess: () => {
      summariesQuery.refetch();
      allPaymentsQuery.refetch();
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
    onError: (err) => {
      Alert.alert("Error", err.message || "Failed to delete payment");
    },
  });

  const resetForm = () => {
    setSelectedUserId(null);
    setSelectedAmount(5000);
    setSelectedMethod("cash_app");
    setNote("");
  };

  const handleRecordPayment = () => {
    if (!selectedUserId) {
      Alert.alert("Error", "Please select a member");
      return;
    }
    recordMutation.mutate({
      userId: selectedUserId,
      amount: selectedAmount,
      note: note.trim() || undefined,
      paymentMethod: selectedMethod,
    });
  };

  const handleDeletePayment = (paymentId: number) => {
    Alert.alert(
      "Delete Payment",
      "Are you sure you want to delete this payment record?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate({ id: paymentId }),
        },
      ]
    );
  };

  const openRecordModal = (userId?: number) => {
    if (userId) setSelectedUserId(userId);
    setShowModal(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Auth/permission gate
  if (authLoading) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (!isAuthenticated || (user as any)?.role !== "admin") {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={styles.centered}>
          <IconSymbol name="shield.fill" size={48} color={colors.muted} />
          <Text style={[styles.accessDeniedText, { color: colors.foreground }]}>
            Admin Access Required
          </Text>
          <Text style={[styles.accessDeniedSub, { color: colors.muted }]}>
            You need admin privileges to access this page.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={[styles.backButtonText, { color: colors.foreground }]}>Go Back</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const summaries = summariesQuery.data || [];
  const allPayments = allPaymentsQuery.data || [];
  const isLoading = summariesQuery.isLoading;

  // Stats
  const totalMembers = summaries.length;
  const paidInFull = summaries.filter((s) => s.isPaidInFull).length;
  const totalCollected = summaries.reduce((sum, s) => sum + s.totalPaid, 0);

  const renderSummaryItem = ({ item }: { item: any }) => {
    const progressPercent = Math.min((item.totalPaid / TOTAL_FEE_CENTS) * 100, 100);
    return (
      <Pressable
        onPress={() => openRecordModal(item.userId)}
        style={({ pressed }) => [
          styles.memberCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
          pressed && { opacity: 0.85 },
        ]}
      >
        <View style={styles.memberCardHeader}>
          <View style={styles.memberInfo}>
            <Text style={[styles.memberName, { color: colors.foreground }]} numberOfLines={1}>
              {item.name || "Unknown"}
            </Text>
            <Text style={[styles.memberEmail, { color: colors.muted }]} numberOfLines={1}>
              {item.email || "No email"}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 2 }}>
            <Text style={[styles.memberPaid, { color: item.isPaidInFull ? colors.success : colors.primary }]}>
              {formatCents(item.totalPaid)}
            </Text>
            {item.isPaidInFull ? (
              <View style={[styles.statusBadge, { backgroundColor: colors.success + "20" }]}>
                <Text style={[styles.statusText, { color: colors.success }]}>Paid</Text>
              </View>
            ) : (
              <View style={[styles.statusBadge, { backgroundColor: colors.warning + "20" }]}>
                <Text style={[styles.statusText, { color: colors.warning }]}>
                  {formatCents(item.remaining)} left
                </Text>
              </View>
            )}
          </View>
        </View>
        <View style={[styles.miniProgress, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.miniProgressFill,
              {
                backgroundColor: item.isPaidInFull ? colors.success : colors.primary,
                width: `${progressPercent}%`,
              },
            ]}
          />
        </View>
      </Pressable>
    );
  };

  const ListHeader = () => (
    <View style={styles.headerContainer}>
      {/* Top Nav */}
      <View style={styles.topNav}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [pressed && { opacity: 0.7 }]}
        >
          <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Payment Management</Text>
        <Pressable
          onPress={() => openRecordModal()}
          style={({ pressed }) => [pressed && { opacity: 0.7 }]}
        >
          <IconSymbol name="plus.circle.fill" size={28} color={colors.primary} />
        </Pressable>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{totalMembers}</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Members</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.success }]}>{paidInFull}</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Paid in Full</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.foreground }]}>{formatCents(totalCollected)}</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Collected</Text>
        </View>
      </View>

      {/* Section Title */}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>All Members</Text>
    </View>
  );

  const ListEmpty = () => (
    <View style={styles.emptyContainer}>
      <IconSymbol name="person.2.fill" size={40} color={colors.muted} />
      <Text style={[styles.emptyText, { color: colors.muted }]}>No members found</Text>
    </View>
  );

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={summaries}
          keyExtractor={(item) => String(item.userId)}
          renderItem={renderSummaryItem}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={ListEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Record Payment Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Record Payment</Text>
                <Pressable
                  onPress={() => { setShowModal(false); resetForm(); }}
                  style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                >
                  <IconSymbol name="xmark.circle.fill" size={28} color={colors.muted} />
                </Pressable>
              </View>

              {/* Member Selection */}
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Select Member</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.memberPicker}
                contentContainerStyle={styles.memberPickerContent}
              >
                {summaries.map((s) => (
                  <Pressable
                    key={s.userId}
                    onPress={() => setSelectedUserId(s.userId)}
                    style={({ pressed }) => [
                      styles.memberChip,
                      {
                        backgroundColor: selectedUserId === s.userId ? colors.primary : colors.surface,
                        borderColor: selectedUserId === s.userId ? colors.primary : colors.border,
                      },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.memberChipText,
                        { color: selectedUserId === s.userId ? "#FFF" : colors.foreground },
                      ]}
                      numberOfLines={1}
                    >
                      {s.name || "Unknown"}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Amount Selection */}
              <Text style={[styles.fieldLabel, { color: colors.foreground, marginTop: 20 }]}>Amount</Text>
              <View style={styles.optionsRow}>
                {AMOUNT_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => setSelectedAmount(opt.value)}
                    style={({ pressed }) => [
                      styles.optionButton,
                      {
                        backgroundColor: selectedAmount === opt.value ? colors.primary : colors.surface,
                        borderColor: selectedAmount === opt.value ? colors.primary : colors.border,
                      },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        { color: selectedAmount === opt.value ? "#FFF" : colors.foreground },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Payment Method */}
              <Text style={[styles.fieldLabel, { color: colors.foreground, marginTop: 20 }]}>Payment Method</Text>
              <View style={styles.optionsRow}>
                {METHOD_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => setSelectedMethod(opt.value)}
                    style={({ pressed }) => [
                      styles.methodChip,
                      {
                        backgroundColor: selectedMethod === opt.value ? colors.primary : colors.surface,
                        borderColor: selectedMethod === opt.value ? colors.primary : colors.border,
                      },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.methodChipText,
                        { color: selectedMethod === opt.value ? "#FFF" : colors.foreground },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Note */}
              <Text style={[styles.fieldLabel, { color: colors.foreground, marginTop: 20 }]}>Note (optional)</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="e.g., Installment 1 of 3"
                placeholderTextColor={colors.muted}
                style={[
                  styles.noteInput,
                  { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                returnKeyType="done"
              />

              {/* Submit */}
              <Pressable
                onPress={handleRecordPayment}
                disabled={recordMutation.isPending || !selectedUserId}
                style={({ pressed }) => [
                  styles.submitButton,
                  {
                    backgroundColor: !selectedUserId ? colors.muted : colors.primary,
                    opacity: recordMutation.isPending ? 0.7 : 1,
                  },
                  pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
                ]}
              >
                {recordMutation.isPending ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    Record {formatCents(selectedAmount)} Payment
                  </Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  // Access denied
  accessDeniedText: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 12,
  },
  accessDeniedSub: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 4,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 50,
    borderWidth: 1,
    marginTop: 20,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  // Header
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 16,
  },
  topNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 4,
  },
  listContent: {
    paddingBottom: 100,
  },
  // Member Card
  memberCard: {
    marginHorizontal: 20,
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  memberCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  memberInfo: {
    flex: 1,
    gap: 2,
    marginRight: 12,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "700",
  },
  memberEmail: {
    fontSize: 12,
  },
  memberPaid: {
    fontSize: 16,
    fontWeight: "800",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  miniProgress: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  miniProgressFill: {
    height: "100%",
    borderRadius: 2,
  },
  // Empty
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  memberPicker: {
    maxHeight: 44,
  },
  memberPickerContent: {
    gap: 8,
  },
  memberChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  memberChipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  optionsRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  optionButton: {
    flex: 1,
    minWidth: 120,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  methodChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  methodChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
  },
  submitButton: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: "center",
    marginBottom: 20,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
});
