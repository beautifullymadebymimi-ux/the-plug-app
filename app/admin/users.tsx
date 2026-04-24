import {
  Text,
  View,
  FlatList,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { IconSymbol } from "@/components/ui/icon-symbol";
import * as Haptics from "expo-haptics";

function formatDate(dateStr: string | Date): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminUsersScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const usersQuery = trpc.userManagement.list.useQuery(undefined, {
    enabled: isAuthenticated && (user as any)?.role === "admin",
  });

  const setRoleMutation = trpc.userManagement.setRole.useMutation({
    onSuccess: () => {
      usersQuery.refetch();
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
    onError: (err) => {
      Alert.alert("Error", err.message || "Failed to update role");
    },
  });

  const setActiveMutation = trpc.userManagement.setActive.useMutation({
    onSuccess: () => {
      usersQuery.refetch();
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
    onError: (err) => {
      Alert.alert("Error", err.message || "Failed to update account status");
    },
  });

  const deleteUserMutation = trpc.userManagement.deleteUser.useMutation({
    onSuccess: () => {
      usersQuery.refetch();
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
    onError: (err) => {
      Alert.alert("Error", err.message || "Failed to delete user");
    },
  });

const handleDeleteUser = (userId: number, name: string | null) => {
  const message = `Are you sure you want to permanently delete ${name || "this user"}?\n\nThis will remove their account, payment history, RSVPs, chat messages, and member profile. This action cannot be undone.`;

  if (Platform.OS === "web") {
    if (!window.confirm(message)) return;
    deleteUserMutation.mutate({ userId });
    return;
  }

  Alert.alert("Delete User", message, [
    { text: "Cancel", style: "cancel" },
    {
      text: "Delete",
      style: "destructive",
      onPress: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        deleteUserMutation.mutate({ userId });
      },
    },
  ]);
};

const handleToggleRole = (userId: number, currentRole: string, name: string | null) => {
  const newRole = currentRole === "admin" ? "user" : "admin";
  const action = newRole === "admin" ? "promote to Admin" : "remove Admin access from";
  const message = `Are you sure you want to ${action} ${name || "this user"}?`;

  if (Platform.OS === "web") {
    if (!window.confirm(message)) return;
    setRoleMutation.mutate({ userId, role: newRole });
    return;
  }

  Alert.alert(`${newRole === "admin" ? "Promote" : "Demote"} User`, message, [
    { text: "Cancel", style: "cancel" },
    {
      text: "Confirm",
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setRoleMutation.mutate({ userId, role: newRole });
      },
    },
  ]);
};

const handleToggleActive = (userId: number, isActive: boolean, name: string | null) => {
  const action = isActive ? "deactivate" : "reactivate";
  const message = `Are you sure you want to ${action} ${name || "this user"}'s account?${
    isActive ? "\n\nThey will no longer be able to access the app." : ""
  }`;

  if (Platform.OS === "web") {
    if (!window.confirm(message)) return;
    setActiveMutation.mutate({ userId, isActive: !isActive });
    return;
  }

  Alert.alert(`${isActive ? "Deactivate" : "Reactivate"} Account`, message, [
    { text: "Cancel", style: "cancel" },
    {
      text: "Confirm",
      style: isActive ? "destructive" : "default",
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setActiveMutation.mutate({ userId, isActive: !isActive });
      },
    },
  ]);
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

  const allUsers = usersQuery.data || [];
  const isLoading = usersQuery.isLoading;
  const activeCount = allUsers.filter((u) => u.isActive).length;
  const adminCount = allUsers.filter((u) => u.role === "admin").length;

  const renderUserItem = ({ item }: { item: any }) => {
    const isSelf = item.id === (user as any)?.id;
    return (
      <View
        style={[
          styles.userCard,
          {
            backgroundColor: colors.surface,
            borderColor: item.isActive ? colors.border : colors.error + "40",
            opacity: item.isActive ? 1 : 0.7,
          },
        ]}
      >
        {/* User Info Row */}
        <View style={styles.userInfoRow}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.primary + "20" }]}>
            <IconSymbol
              name={item.role === "admin" ? "shield.fill" : "person.fill"}
              size={22}
              color={item.role === "admin" ? colors.primary : colors.muted}
            />
          </View>
          <View style={styles.userDetails}>
            <View style={styles.nameRow}>
              <Text style={[styles.userName, { color: colors.foreground }]} numberOfLines={1}>
                {item.name || "Unknown"}
              </Text>
              {isSelf && (
                <View style={[styles.youBadge, { backgroundColor: colors.primary + "20" }]}>
                  <Text style={[styles.youBadgeText, { color: colors.primary }]}>You</Text>
                </View>
              )}
            </View>
            <Text style={[styles.userEmail, { color: colors.muted }]} numberOfLines={1}>
              {item.email || "No email"}
            </Text>
            <View style={styles.metaRow}>
              <Text style={[styles.metaText, { color: colors.muted }]}>
                Joined {formatDate(item.createdAt)}
              </Text>
              {!item.isActive && (
                <View style={[styles.deactivatedBadge, { backgroundColor: colors.error + "20" }]}>
                  <Text style={[styles.deactivatedText, { color: colors.error }]}>Deactivated</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          {/* Role Toggle */}
          <Pressable
            onPress={() => handleToggleRole(item.id, item.role, item.name)}
            disabled={isSelf || setRoleMutation.isPending}
            style={({ pressed }) => [
              styles.actionButton,
              {
                backgroundColor: item.role === "admin" ? colors.primary + "15" : colors.surface,
                borderColor: item.role === "admin" ? colors.primary + "40" : colors.border,
                opacity: isSelf ? 0.4 : 1,
              },
              pressed && !isSelf && { opacity: 0.7 },
            ]}
          >
            <IconSymbol
              name={item.role === "admin" ? "shield.fill" : "person.fill.checkmark"}
              size={16}
              color={item.role === "admin" ? colors.primary : colors.muted}
            />
            <Text
              style={[
                styles.actionButtonText,
                { color: item.role === "admin" ? colors.primary : colors.foreground },
              ]}
            >
              {item.role === "admin" ? "Admin" : "Make Admin"}
            </Text>
          </Pressable>

          {/* Active/Deactivate Toggle */}
          <Pressable
            onPress={() => handleToggleActive(item.id, item.isActive, item.name)}
            disabled={isSelf || setActiveMutation.isPending}
            style={({ pressed }) => [
              styles.actionButton,
              {
                backgroundColor: item.isActive ? colors.surface : colors.error + "15",
                borderColor: item.isActive ? colors.border : colors.error + "40",
                opacity: isSelf ? 0.4 : 1,
              },
              pressed && !isSelf && { opacity: 0.7 },
            ]}
          >
            <IconSymbol
              name={item.isActive ? "person.slash.fill" : "arrow.counterclockwise"}
              size={16}
              color={item.isActive ? colors.error : colors.success}
            />
            <Text
              style={[
                styles.actionButtonText,
                { color: item.isActive ? colors.error : colors.success },
              ]}
            >
              {item.isActive ? "Deactivate" : "Reactivate"}
            </Text>
          </Pressable>

          {/* Delete Button */}
          <Pressable
            onPress={() => handleDeleteUser(item.id, item.name)}
            disabled={isSelf || deleteUserMutation.isPending}
            style={({ pressed }) => [
              styles.actionButton,
              {
                backgroundColor: colors.error + "10",
                borderColor: colors.error + "30",
                opacity: isSelf ? 0.4 : 1,
              },
              pressed && !isSelf && { opacity: 0.7 },
            ]}
          >
            <IconSymbol
              name="trash.fill"
              size={16}
              color={colors.error}
            />
            <Text
              style={[
                styles.actionButtonText,
                { color: colors.error },
              ]}
            >
              Delete
            </Text>
          </Pressable>
        </View>
      </View>
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
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>User Management</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{allUsers.length}</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Total Users</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.success }]}>{activeCount}</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Active</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.warning }]}>{adminCount}</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Admins</Text>
        </View>
      </View>

      {/* Info Banner */}
      <View style={[styles.infoBanner, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
        <IconSymbol name="exclamationmark.circle" size={18} color={colors.primary} />
        <Text style={[styles.infoBannerText, { color: colors.foreground }]}>
          Admins can manage payments, users, and app content. Deactivated users cannot access the app.
        </Text>
      </View>

      {/* Section Title */}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>All Users</Text>
    </View>
  );

  const ListEmpty = () => (
    <View style={styles.emptyContainer}>
      <IconSymbol name="person.2.fill" size={40} color={colors.muted} />
      <Text style={[styles.emptyText, { color: colors.muted }]}>No users found</Text>
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
          data={allUsers}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderUserItem}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={ListEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
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
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 4,
  },
  listContent: {
    paddingBottom: 100,
  },
  // User Card
  userCard: {
    marginHorizontal: 20,
    marginTop: 10,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
  },
  userInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  userDetails: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    flexShrink: 1,
  },
  youBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  youBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  userEmail: {
    fontSize: 13,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  metaText: {
    fontSize: 12,
  },
  deactivatedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  deactivatedText: {
    fontSize: 11,
    fontWeight: "700",
  },
  // Actions
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
