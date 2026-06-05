import { useMemo, useState } from "react";
import { Text, View, Pressable, StyleSheet, ScrollView, Platform, TextInput, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { IconSymbol } from "@/components/ui/icon-symbol";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/hooks/use-auth";

const eventTypeColors: Record<string, string> = {
  rehearsal: "#3B82F6",
  service: "#8B5CF6",
  special: "#F59E0B",
  other: "#6B7280",
};

const EVENT_TYPES = ["rehearsal", "service", "special", "other"] as const;


const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function toTimePickerParts(dateValue: string | Date) {
  const d = new Date(dateValue);
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm: "AM" | "PM" = hours >= 12 ? "PM" : "AM";

  hours = hours % 12;
  if (hours === 0) hours = 12;

  return {
    year: d.getFullYear(),
    month: d.getMonth(),
    day: d.getDate(),
    hour: hours,
    minute: Math.round(minutes / 5) * 5 === 60 ? 55 : Math.round(minutes / 5) * 5,
    ampm,
  };
}


export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
const colors = useColors();
const router = useRouter();
const { user } = useAuth();
const utils = trpc.useUtils();
  const { data: event, refetch } = trpc.events.byId.useQuery({ id: Number(id) }, { enabled: !!id });
  const { data: rsvps, refetch: refetchRsvps } = trpc.events.rsvps.useQuery({ eventId: Number(id) }, { enabled: !!id });
  const rsvpMutation = trpc.events.rsvp.useMutation({ onSuccess: () => refetchRsvps() });
  const updateMutation = trpc.events.update.useMutation({
    onSuccess: () => {
      refetch();
      setEditing(false);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: () => Alert.alert("Error", "Could not update the event."),
  });

const deleteMutation = trpc.events.delete.useMutation({
  onSuccess: async () => {
    await utils.events.list.invalidate();

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

   router.replace("/(tabs)/events");
  },
  onError: (err) => {
    Alert.alert("Error", err.message || "Could not delete the event.");
  },
});

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editType, setEditType] = useState<string>("other");
  const [editYear, setEditYear] = useState(new Date().getFullYear());
  const [editMonth, setEditMonth] = useState(new Date().getMonth());
  const [editDay, setEditDay] = useState(new Date().getDate());
  const [editHour, setEditHour] = useState(10);
  const [editMinute, setEditMinute] = useState(0);
  const [editAmPm, setEditAmPm] = useState<"AM" | "PM">("AM");
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [showEditTimePicker, setShowEditTimePicker] = useState(false);

  const editCalendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(editYear, editMonth);
    const firstDay = getFirstDayOfMonth(editYear, editMonth);
    const days: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    return days;
  }, [editYear, editMonth]);

  const editDateObj = useMemo(() => {
    let h = editHour;
    if (editAmPm === "PM" && h !== 12) h += 12;
    if (editAmPm === "AM" && h === 12) h = 0;

    return new Date(editYear, editMonth, editDay, h, editMinute);
  }, [editYear, editMonth, editDay, editHour, editMinute, editAmPm]);

  const formattedEditDate = useMemo(() => {
    return `${DAYS_OF_WEEK[editDateObj.getDay()]}, ${MONTHS[editMonth].slice(0, 3)} ${editDay}, ${editYear}`;
  }, [editDateObj, editMonth, editDay, editYear]);

  const formattedEditTime = useMemo(() => {
    return `${editHour}:${editMinute.toString().padStart(2, "0")} ${editAmPm}`;
  }, [editHour, editMinute, editAmPm]);

  const prevEditMonth = () => {
    if (editMonth === 0) {
      setEditMonth(11);
      setEditYear((year) => year - 1);
    } else {
      setEditMonth((month) => month - 1);
    }
  };

  const nextEditMonth = () => {
    if (editMonth === 11) {
      setEditMonth(0);
      setEditYear((year) => year + 1);
    } else {
      setEditMonth((month) => month + 1);
    }
  };

  const startEditing = () => {
    if (!event) return;

    const parts = toTimePickerParts(event.date);

    setEditTitle(event.title);
    setEditDescription(event.description || "");
    setEditLocation(event.location || "");
    setEditType(event.type);
    setEditYear(parts.year);
    setEditMonth(parts.month);
    setEditDay(parts.day);
    setEditHour(parts.hour);
    setEditMinute(parts.minute);
    setEditAmPm(parts.ampm);
    setShowEditDatePicker(false);
    setShowEditTimePicker(false);
    setEditing(true);
  };

  const handleSave = () => {
    if (!editTitle.trim()) {
      Alert.alert("Required", "Event title is required.");
      return;
    }
    updateMutation.mutate({
      id: Number(id),
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
      location: editLocation.trim() || undefined,
      type: editType as any,
      date: editDateObj.toISOString(),
    });
  };

 const handleDelete = () => {
  if (Platform.OS === "web") {
    const confirmed = window.confirm("Are you sure you want to delete this event?");
    if (!confirmed) return;

    console.log("DELETE PRESSED", id);
    deleteMutation.mutate({ id: Number(id) });
    return;
  }

  Alert.alert(
    "Delete Event",
    "Are you sure you want to delete this event?",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          console.log("DELETE PRESSED", id);
          deleteMutation.mutate({ id: Number(id) });
        },
      },
    ]
  );
};
  const handleRsvp = (status: "going" | "maybe" | "cant_make_it") => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    rsvpMutation.mutate({ eventId: Number(id), status });
  };

  if (!event) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.muted }]}>Loading...</Text>
        </View>
      </ScreenContainer>
    );
  }

  const typeColor = eventTypeColors[event.type] || eventTypeColors.other;
  const myRsvp = rsvps?.find((r) => r.userId === user?.id);
  const myRsvpLabel =
    myRsvp?.status === "going"
      ? "✅ Going"
      : myRsvp?.status === "maybe"
        ? "⏰ Maybe"
        : myRsvp?.status === "cant_make_it"
          ? "❌ Can't Make It"
          : null;

  // ---- Edit Mode ----
  if (editing) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={styles.navBar}>
          <Pressable onPress={() => setEditing(false)} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
            <Text style={[styles.cancelText, { color: colors.muted }]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.navTitle, { color: colors.foreground }]}>Edit Event</Text>
          <Pressable
            onPress={handleSave}
            disabled={updateMutation.isPending}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.saveText, { color: editTitle.trim() ? colors.primary : colors.muted }]}>
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.editContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Title */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.muted }]}>Title *</Text>
            <TextInput
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Event title"
              placeholderTextColor={colors.muted}
              style={[styles.formInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
            />
          </View>

          {/* Type */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.muted }]}>Type</Text>
            <View style={styles.chipRow}>
              {EVENT_TYPES.map((t) => {
                const isActive = editType === t;
                const tColor = eventTypeColors[t];
                return (
                  <Pressable
                    key={t}
                    onPress={() => {
                      setEditType(t);
                      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={({ pressed }) => [
                      styles.chip,
                      { borderColor: isActive ? tColor : colors.border, backgroundColor: isActive ? tColor + "20" : colors.surface },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: isActive ? tColor : colors.foreground }]}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Date */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.muted }]}>Date</Text>
            <Pressable
              onPress={() => {
                setShowEditDatePicker(!showEditDatePicker);
                setShowEditTimePicker(false);
              }}
              style={({ pressed }) => [
                styles.dateTimeButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: showEditDatePicker ? colors.primary : colors.border,
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              <IconSymbol name="calendar" size={18} color={showEditDatePicker ? colors.primary : colors.muted} />
              <Text style={[styles.dateTimeText, { color: colors.foreground }]}>{formattedEditDate}</Text>
              <IconSymbol name={showEditDatePicker ? "chevron.up" : "chevron.down"} size={14} color={colors.muted} />
            </Pressable>

            {showEditDatePicker && (
              <View style={[styles.calendarContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.calendarHeader}>
                  <Pressable onPress={prevEditMonth} style={({ pressed }) => [styles.calendarNav, { backgroundColor: colors.background }, pressed && { opacity: 0.7 }]}>
                    <IconSymbol name="chevron.left" size={18} color={colors.foreground} />
                  </Pressable>

                  <Text style={[styles.calendarTitle, { color: colors.foreground }]}>
                    {MONTHS[editMonth]} {editYear}
                  </Text>

                  <Pressable onPress={nextEditMonth} style={({ pressed }) => [styles.calendarNav, { backgroundColor: colors.background }, pressed && { opacity: 0.7 }]}>
                    <IconSymbol name="chevron.right" size={18} color={colors.foreground} />
                  </Pressable>
                </View>

                <View style={styles.weekDays}>
                  {DAYS_OF_WEEK.map((day) => (
                    <Text key={day} style={[styles.weekDayText, { color: colors.muted }]}>{day}</Text>
                  ))}
                </View>

                <View style={styles.daysGrid}>
                  {editCalendarDays.map((day, index) => {
                    const isSelected = day === editDay;

                    return (
                      <Pressable
                        key={`${day || "empty"}-${index}`}
                        disabled={!day}
                        onPress={() => {
                          if (day) {
                            setEditDay(day);
                            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }
                        }}
                        style={({ pressed }) => [
                          styles.dayCell,
                          day && isSelected && { backgroundColor: colors.primary },
                          pressed && day && { opacity: 0.7 },
                        ]}
                      >
                        {day && (
                          <Text style={[styles.dayText, { color: isSelected ? "#FFF" : colors.foreground }]}>
                            {day}
                          </Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* Time */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.muted }]}>Time</Text>
            <Pressable
              onPress={() => {
                setShowEditTimePicker(!showEditTimePicker);
                setShowEditDatePicker(false);
              }}
              style={({ pressed }) => [
                styles.dateTimeButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: showEditTimePicker ? colors.primary : colors.border,
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              <IconSymbol name="clock" size={18} color={showEditTimePicker ? colors.primary : colors.muted} />
              <Text style={[styles.dateTimeText, { color: colors.foreground }]}>{formattedEditTime}</Text>
              <IconSymbol name={showEditTimePicker ? "chevron.up" : "chevron.down"} size={14} color={colors.muted} />
            </Pressable>

            {showEditTimePicker && (
              <View style={[styles.timeContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.timeColumn}>
                  <Text style={[styles.timeLabel, { color: colors.muted }]}>Hour</Text>
                  <View style={styles.timeScrollRow}>
                    <Pressable onPress={() => setEditHour((h) => h <= 1 ? 12 : h - 1)} style={({ pressed }) => [styles.timeArrow, { backgroundColor: colors.background }, pressed && { opacity: 0.6 }]}>
                      <IconSymbol name="chevron.up" size={16} color={colors.foreground} />
                    </Pressable>
                    <View style={[styles.timeValueBox, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}>
                      <Text style={[styles.timeValue, { color: colors.primary }]}>{editHour}</Text>
                    </View>
                    <Pressable onPress={() => setEditHour((h) => h >= 12 ? 1 : h + 1)} style={({ pressed }) => [styles.timeArrow, { backgroundColor: colors.background }, pressed && { opacity: 0.6 }]}>
                      <IconSymbol name="chevron.down" size={16} color={colors.foreground} />
                    </Pressable>
                  </View>
                </View>

                <Text style={[styles.timeColon, { color: colors.foreground }]}>:</Text>

                <View style={styles.timeColumn}>
                  <Text style={[styles.timeLabel, { color: colors.muted }]}>Min</Text>
                  <View style={styles.timeScrollRow}>
                    <Pressable onPress={() => setEditMinute((m) => m <= 0 ? 55 : m - 5)} style={({ pressed }) => [styles.timeArrow, { backgroundColor: colors.background }, pressed && { opacity: 0.6 }]}>
                      <IconSymbol name="chevron.up" size={16} color={colors.foreground} />
                    </Pressable>
                    <View style={[styles.timeValueBox, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}>
                      <Text style={[styles.timeValue, { color: colors.primary }]}>{editMinute.toString().padStart(2, "0")}</Text>
                    </View>
                    <Pressable onPress={() => setEditMinute((m) => m >= 55 ? 0 : m + 5)} style={({ pressed }) => [styles.timeArrow, { backgroundColor: colors.background }, pressed && { opacity: 0.6 }]}>
                      <IconSymbol name="chevron.down" size={16} color={colors.foreground} />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.timeColumn}>
                  <Text style={[styles.timeLabel, { color: colors.muted }]}>{" "}</Text>
                  <View style={styles.ampmColumn}>
                    <Pressable
                      onPress={() => {
                        setEditAmPm("AM");
                        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={({ pressed }) => [
                        styles.ampmBtn,
                        {
                          borderColor: editAmPm === "AM" ? colors.primary : colors.border,
                          backgroundColor: editAmPm === "AM" ? colors.primary : "transparent",
                        },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Text style={[styles.ampmText, { color: editAmPm === "AM" ? "#FFF" : colors.muted }]}>AM</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        setEditAmPm("PM");
                        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={({ pressed }) => [
                        styles.ampmBtn,
                        {
                          borderColor: editAmPm === "PM" ? colors.primary : colors.border,
                          backgroundColor: editAmPm === "PM" ? colors.primary : "transparent",
                        },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Text style={[styles.ampmText, { color: editAmPm === "PM" ? "#FFF" : colors.muted }]}>PM</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            )}

            <View style={[styles.dateTimeSummary, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
              <IconSymbol name="calendar" size={16} color={colors.primary} />
              <Text style={[styles.dateTimeSummaryText, { color: colors.primary }]}>
                {formattedEditDate} at {formattedEditTime}
              </Text>
            </View>
          </View>

          {/* Location */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.muted }]}>Location</Text>
            <TextInput
              value={editLocation}
              onChangeText={setEditLocation}
              placeholder="Where is the event?"
              placeholderTextColor={colors.muted}
              style={[styles.formInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
            />
          </View>

          {/* Description */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.muted }]}>Description</Text>
            <TextInput
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Event details..."
              placeholderTextColor={colors.muted}
              multiline
              style={[styles.formTextArea, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
            />
          </View>

          {/* Delete Button */}
          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => [styles.deleteButton, { backgroundColor: colors.error + "15", borderColor: colors.error + "40" }, pressed && { opacity: 0.7 }]}
          >
            <IconSymbol name="trash" size={18} color={colors.error} />
            <Text style={[styles.deleteText, { color: colors.error }]}>Delete Event</Text>
          </Pressable>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // ---- View Mode ----
  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backButton, { backgroundColor: colors.surface }, pressed && { opacity: 0.7 }]}>
          <IconSymbol name="arrow.left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>Event Details</Text>
        <Pressable
          onPress={() => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); startEditing(); }}
          style={({ pressed }) => [styles.editButton, { backgroundColor: colors.primary }, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Type Badge */}
        <View style={[styles.typeBadge, { backgroundColor: typeColor }]}>
          <Text style={styles.typeText}>{event.type}</Text>
        </View>

        {/* Title */}
        <Text style={[styles.eventTitle, { color: colors.foreground }]}>{event.title}</Text>

        {/* Date & Time */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <IconSymbol name="calendar" size={20} color={colors.primary} />
            <View>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>Date</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {new Date(event.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <IconSymbol name="clock" size={20} color={colors.primary} />
            <View>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>Time</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {new Date(event.date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </Text>
            </View>
          </View>
          {event.location && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.infoRow}>
                <IconSymbol name="mappin" size={20} color={colors.primary} />
                <View>
                  <Text style={[styles.infoLabel, { color: colors.muted }]}>Location</Text>
                  <Text style={[styles.infoValue, { color: colors.foreground }]}>{event.location}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Description */}
        {event.description && (
          <View style={[styles.descriptionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.descriptionTitle, { color: colors.foreground }]}>About</Text>
            <Text style={[styles.descriptionText, { color: colors.muted }]}>{event.description}</Text>
          </View>
        )}

        {/* RSVP */}
        <View style={styles.rsvpSection}>
          <Text style={[styles.rsvpTitle, { color: colors.foreground }]}>Are you going?</Text>

          {myRsvpLabel && (
            <View style={[styles.myRsvpCard, { backgroundColor: colors.primary + "14", borderColor: colors.primary + "35" }]}>
              <Text style={[styles.myRsvpText, { color: colors.primary }]}>
                Your RSVP: {myRsvpLabel}
              </Text>
            </View>
          )}

          <View style={styles.rsvpButtons}>
            {([
              { status: "going" as const, label: "Going", emoji: "checkmark.circle.fill" as const },
              { status: "maybe" as const, label: "Maybe", emoji: "clock" as const },
              { status: "cant_make_it" as const, label: "Can't", emoji: "xmark" as const },
            ]).map((opt) => (
              <Pressable
                key={opt.status}
                onPress={() => handleRsvp(opt.status)}
                style={({ pressed }) => [
                  styles.rsvpButton,
                  {
                    backgroundColor: myRsvp?.status === opt.status ? colors.primary + "18" : colors.surface,
                    borderColor: myRsvp?.status === opt.status ? colors.primary : colors.border,
                  },
                  pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                ]}
              >
                <IconSymbol
                  name={opt.emoji}
                  size={20}
                  color={myRsvp?.status === opt.status ? colors.primary : colors.muted}
                />
                <Text
                  style={[
                    styles.rsvpButtonText,
                    { color: myRsvp?.status === opt.status ? colors.primary : colors.foreground },
                  ]}
                >
                  {opt.label}{myRsvp?.status === opt.status ? " ✓" : ""}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Attendees */}
        {rsvps && rsvps.length > 0 && (
          <View style={[styles.attendeesCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.attendeesTitle, { color: colors.foreground }]}>
              Responses ({rsvps.length})
            </Text>

            <View style={styles.rsvpSummaryRow}>
              <View style={[styles.rsvpSummaryPill, { backgroundColor: colors.success + "18" }]}>
                <Text style={[styles.rsvpSummaryText, { color: colors.success }]}>
                  ✅ Going: {rsvps.filter((r) => r.status === "going").length}
                </Text>
              </View>

              <View style={[styles.rsvpSummaryPill, { backgroundColor: colors.warning + "18" }]}>
                <Text style={[styles.rsvpSummaryText, { color: colors.warning }]}>
                  ⏰ Maybe: {rsvps.filter((r) => r.status === "maybe").length}
                </Text>
              </View>

              <View style={[styles.rsvpSummaryPill, { backgroundColor: colors.error + "18" }]}>
                <Text style={[styles.rsvpSummaryText, { color: colors.error }]}>
                  ❌ Can't: {rsvps.filter((r) => r.status === "cant_make_it").length}
                </Text>
              </View>
            </View>

            {rsvps.map((r) => (
              <View key={r.id} style={[styles.attendeeRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.attendeeName, { color: colors.foreground }]}>{r.user?.name || "Unknown"}</Text>
                <Text style={[styles.attendeeStatus, {
                  color: r.status === "going" ? colors.success : r.status === "maybe" ? colors.warning : colors.error,
                }]}>{r.status === "cant_make_it" ? "Can't make it" : r.status}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  dateTimeButton: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dateTimeText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
  },
  calendarContainer: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  calendarNav: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  weekDays: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekDayText: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "900",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.285%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    marginVertical: 2,
  },
  dayText: {
    fontSize: 14,
    fontWeight: "900",
  },
  timeContainer: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  timeColumn: {
    alignItems: "center",
    gap: 7,
  },
  timeLabel: {
    fontSize: 11,
    fontWeight: "900",
  },
  timeScrollRow: {
    alignItems: "center",
    gap: 6,
  },
  timeArrow: {
    width: 34,
    height: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  timeValueBox: {
    width: 54,
    height: 42,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  timeValue: {
    fontSize: 18,
    fontWeight: "950",
  },
  timeColon: {
    fontSize: 28,
    fontWeight: "950",
    marginTop: 20,
  },
  ampmColumn: {
    gap: 7,
  },
  ampmBtn: {
    minWidth: 48,
    minHeight: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  ampmText: {
    fontSize: 12,
    fontWeight: "950",
  },
  dateTimeSummary: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateTimeSummaryText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
  },

  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 16 },
  navBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12 },
  backButton: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  navTitle: { fontSize: 17, fontWeight: "600" },
  editButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  editButtonText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  cancelText: { fontSize: 16 },
  saveText: { fontSize: 16, fontWeight: "700" },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
  editContent: { paddingHorizontal: 20, paddingBottom: 40, gap: 20 },
  typeBadge: { alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  typeText: { color: "#FFF", fontSize: 13, fontWeight: "700", textTransform: "capitalize" },
  eventTitle: { fontSize: 28, fontWeight: "800", lineHeight: 34 },
  infoCard: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 0 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 10 },
  infoLabel: { fontSize: 12, fontWeight: "600" },
  infoValue: { fontSize: 15, fontWeight: "500", marginTop: 2 },
  divider: { height: 1, marginLeft: 34 },
  descriptionCard: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 8 },
  descriptionTitle: { fontSize: 16, fontWeight: "700" },
  descriptionText: { fontSize: 15, lineHeight: 22 },
  rsvpSection: { gap: 12 },
  rsvpTitle: { fontSize: 18, fontWeight: "700" },
  rsvpButtons: { flexDirection: "row", gap: 10 },
  rsvpButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, gap: 6 },
  rsvpButtonText: { fontSize: 14, fontWeight: "700" },
  myRsvpCard: { borderWidth: 1, borderRadius: 14, padding: 12 },
  myRsvpText: { fontSize: 14, fontWeight: "800" },
  rsvpSummaryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  rsvpSummaryPill: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999 },
  rsvpSummaryText: { fontSize: 12, fontWeight: "800" },
  attendeesCard: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 4 },
  attendeesTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  attendeeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 0.5 },
  attendeeName: { fontSize: 15, fontWeight: "500" },
  attendeeStatus: { fontSize: 13, fontWeight: "600", textTransform: "capitalize" },
  // Edit form
  formGroup: { gap: 6 },
  formLabel: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  formInput: { padding: 14, borderRadius: 12, borderWidth: 1, fontSize: 16 },
  formTextArea: { padding: 14, borderRadius: 12, borderWidth: 1, fontSize: 16, minHeight: 100, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  chipText: { fontSize: 13, fontWeight: "600" },
  deleteButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, borderRadius: 14, borderWidth: 1, gap: 8, marginTop: 12 },
  deleteText: { fontSize: 15, fontWeight: "700" },
});
