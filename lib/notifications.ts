import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Configure how notifications are shown when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions and set up Android channel
 */
export async function registerForNotifications(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "The Plug",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#1DB954",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === "granted";
}

/**
 * Send a local notification for a new event
 */
export async function notifyNewEvent(
  title: string,
  date: string,
  location?: string,
) {
  if (Platform.OS === "web") {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "New Event Added",
      body: `${title}${location ? ` at ${location}` : ""} — ${new Date(date).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })}`,
    },
    trigger: null,
  });
}

/**
 * Send a local notification for a new devotional
 */
export async function notifyNewDevotional(title: string, scriptureRef?: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "New Devotional",
      body: scriptureRef ? `${title} — ${scriptureRef}` : title,
      data: { type: "devotional" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
    },
  });
}

/**
 * Send a local notification for a new chat message
 */
export async function notifyNewChat(senderName: string, message: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${senderName} in Group Chat`,
      body: message.length > 100 ? message.substring(0, 100) + "..." : message,
      data: { type: "chat" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
    },
  });
}

/**
 * Schedule a reminder for an upcoming event
 */
export async function scheduleEventReminder(eventTitle: string, eventDate: Date) {
  const reminderDate = new Date(eventDate);
  reminderDate.setHours(reminderDate.getHours() - 1); // 1 hour before

  if (reminderDate <= new Date()) return; // Don't schedule if already past

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Event Starting Soon",
      body: `${eventTitle} starts in 1 hour!`,
      data: { type: "event_reminder" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderDate,
    },
  });
}
