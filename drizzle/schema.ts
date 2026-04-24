import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: text("passwordHash"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  isActive: boolean("isActive").default(true).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Member profiles — extended user info for group members.
 */
export const memberProfiles = mysqlTable("member_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("memberRole", { length: 128 }),
  instrument: varchar("instrument", { length: 128 }),
  voiceType: varchar("voiceType", { length: 64 }),
  interests: text("interests"),
  profileImageUrl: text("profileImageUrl"),
  phone: varchar("phone", { length: 32 }),
  bio: text("bio"),
  avatarUrl: text("avatarUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MemberProfile = typeof memberProfiles.$inferSelect;
export type InsertMemberProfile = typeof memberProfiles.$inferInsert;

/**
 * Events — rehearsals, services, special events.
 */
export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  endDate: timestamp("endDate"),
  location: varchar("location", { length: 255 }),
  type: mysqlEnum("type", ["rehearsal", "service", "special", "other"]).default("other").notNull(),
  imageUrl: text("imageUrl"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

/**
 * Event RSVPs — track who is attending.
 */
export const eventRsvps = mysqlTable("event_rsvps", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", ["going", "maybe", "cant_make_it"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EventRsvp = typeof eventRsvps.$inferSelect;
export type InsertEventRsvp = typeof eventRsvps.$inferInsert;

/**
 * Songs — the group's song library.
 */
export const songs = mysqlTable("songs", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  artist: varchar("artist", { length: 255 }),
  songKey: varchar("songKey", { length: 16 }),
  tempo: int("tempo"),
  lyrics: text("lyrics"),
  notes: text("notes"),
  youtubeUrl: text("youtubeUrl"),
  spotifyUrl: text("spotifyUrl"),
  audioUrl: text("audioUrl"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Song = typeof songs.$inferSelect;
export type InsertSong = typeof songs.$inferInsert;

/**
 * Setlists — ordered song lists for events.
 */
export const setlists = mysqlTable("setlists", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  eventId: int("eventId"),
  date: timestamp("date"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Setlist = typeof setlists.$inferSelect;
export type InsertSetlist = typeof setlists.$inferInsert;

/**
 * Setlist songs — junction table for setlist <-> song ordering.
 */
export const setlistSongs = mysqlTable("setlist_songs", {
  id: int("id").autoincrement().primaryKey(),
  setlistId: int("setlistId").notNull(),
  songId: int("songId").notNull(),
  orderIndex: int("orderIndex").notNull().default(0),
  notes: text("notes"),
});

export type SetlistSong = typeof setlistSongs.$inferSelect;
export type InsertSetlistSong = typeof setlistSongs.$inferInsert;

/**
 * Media — photos and videos shared by the group.
 */
export const media = mysqlTable("media", {
  id: int("id").autoincrement().primaryKey(),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnailUrl"),
  type: mysqlEnum("type", ["photo", "video"]).default("photo").notNull(),
  caption: text("caption"),
  uploadedBy: int("uploadedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Media = typeof media.$inferSelect;
export type InsertMedia = typeof media.$inferInsert;

/**
 * Devotionals — daily scripture and reflections.
 */
export const devotionals = mysqlTable("devotionals", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  scripture: text("scripture"),
  scriptureReference: varchar("scriptureReference", { length: 128 }),
  content: text("content").notNull(),
  date: timestamp("date").notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Devotional = typeof devotionals.$inferSelect;
export type InsertDevotional = typeof devotionals.$inferInsert;

/**
 * Chat messages — group chat.
 */
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

/**
 * Suggestions — community suggestion board for song ideas, venues, etc.
 */
export const suggestions = mysqlTable("suggestions", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId").notNull(),
  category: mysqlEnum("category", ["song", "venue", "event", "general"]).default("general").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  likes: int("likes").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Suggestion = typeof suggestions.$inferSelect;
export type InsertSuggestion = typeof suggestions.$inferInsert;

/**
 * Suggestion comments — threaded replies on suggestions.
 */
export const suggestionComments = mysqlTable("suggestion_comments", {
  id: int("id").autoincrement().primaryKey(),
  suggestionId: int("suggestionId").notNull(),
  memberId: int("memberId").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SuggestionComment = typeof suggestionComments.$inferSelect;
export type InsertSuggestionComment = typeof suggestionComments.$inferInsert;

/**
 * Member payments — track membership fee payments ($150 total, pay in full or 3x$50 installments).
 */
export const memberPayments = mysqlTable("member_payments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  amount: int("amount").notNull(), // amount in cents (e.g., 15000 = $150, 5000 = $50)
  note: text("note"), // admin note (e.g., "Installment 1 of 3", "Paid in full")
  recordedBy: int("recordedBy").notNull(), // admin who recorded the payment
  paymentMethod: varchar("paymentMethod", { length: 64 }), // e.g., "cash_app", "zelle", "cash"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MemberPayment = typeof memberPayments.$inferSelect;
export type InsertMemberPayment = typeof memberPayments.$inferInsert;
