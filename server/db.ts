import { and, desc, eq, gte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  events, InsertEvent,
  eventRsvps, InsertEventRsvp,
  songs, InsertSong,
  setlists, InsertSetlist,
  setlistSongs, InsertSetlistSong,
  media, InsertMedia,
  devotionals, InsertDevotional,
  chatMessages, InsertChatMessage,
  memberProfiles, InsertMemberProfile,
  suggestions, InsertSuggestion,
  suggestionComments, InsertSuggestionComment,
  memberPayments, InsertMemberPayment,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function updateUserRole(email: string, role: "user" | "admin") {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database not available");

  await dbConn
    .update(users)
    .set({ role })
    .where(eq(users.email, email));
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users);
}
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user by email: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createUser(data: InsertUser) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(users).values(data);
  return result[0].insertId;
}

// ─── Member Profiles ─────────────────────────────────────
export async function getMemberProfile(profileId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(memberProfiles).where(eq(memberProfiles.id, profileId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createMemberProfile(data: InsertMemberProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(memberProfiles).values(data);
  return result[0].insertId;
}

export async function updateMemberProfile(id: number, data: Partial<InsertMemberProfile>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(memberProfiles).set(data).where(eq(memberProfiles.id, id));
}

export async function getAllMemberProfiles() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(memberProfiles).orderBy(memberProfiles.name);
}

// ─── Events ──────────────────────────────────────────────
export async function getEvents() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(events).orderBy(desc(events.date));
}

export async function getUpcomingEvents(limit = 5) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(events).where(gte(events.date, new Date())).orderBy(events.date).limit(limit);
}

export async function getEventById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createEvent(data: InsertEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(events).values(data);
  return result[0].insertId;
}

export async function updateEvent(id: number, data: Partial<InsertEvent>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(events).set(data).where(eq(events.id, id));
}
export async function deleteEvent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  console.log("[DB] deleteEvent called with id:", id);

  const result = await db.delete(events).where(eq(events.id, id));
  console.log("[DB] deleteEvent result:", result);

  const remaining = await db.select().from(events).where(eq(events.id, id)).limit(1);
  console.log("[DB] deleteEvent remaining rows:", remaining.length);
}

// ─── Event RSVPs ─────────────────────────────────────────
export async function getEventRsvps(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  const rsvps = await db.select().from(eventRsvps).where(eq(eventRsvps.eventId, eventId));
  const allUsers = await db.select().from(users);
  return rsvps.map(r => ({
    ...r,
    user: allUsers.find(u => u.id === r.userId) || null,
  }));
}

export async function upsertRsvp(data: InsertEventRsvp) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(eventRsvps)
    .where(and(eq(eventRsvps.eventId, data.eventId), eq(eventRsvps.userId, data.userId))).limit(1);
  if (existing.length > 0) {
    await db.update(eventRsvps).set({ status: data.status }).where(eq(eventRsvps.id, existing[0].id));
  } else {
    await db.insert(eventRsvps).values(data);
  }
}

// ─── Songs ───────────────────────────────────────────────
export async function getSongs() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(songs).orderBy(songs.title);
}

export async function getSongById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(songs).where(eq(songs.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createSong(data: InsertSong) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(songs).values(data);
  return result[0].insertId;
}

export async function updateSong(id: number, data: Partial<InsertSong>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(songs).set(data).where(eq(songs.id, id));
}

export async function deleteSong(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(songs).where(eq(songs.id, id));
}

// ─── Setlists ────────────────────────────────────────────
export async function getSetlists() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(setlists).orderBy(desc(setlists.date));
}

export async function getSetlistById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(setlists).where(eq(setlists.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createSetlist(data: InsertSetlist) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(setlists).values(data);
  return result[0].insertId;
}

export async function getSetlistSongs(setlistId: number) {
  const db = await getDb();
  if (!db) return [];
  const items = await db.select().from(setlistSongs).where(eq(setlistSongs.setlistId, setlistId)).orderBy(setlistSongs.orderIndex);
  const allSongs = await db.select().from(songs);
  return items.map(item => ({
    ...item,
    song: allSongs.find(s => s.id === item.songId) || null,
  }));
}

export async function addSongToSetlist(data: InsertSetlistSong) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(setlistSongs).values(data);
}

export async function removeSongFromSetlist(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(setlistSongs).where(eq(setlistSongs.id, id));
}

// ─── Media ───────────────────────────────────────────────
export async function getMedia() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(media).orderBy(desc(media.createdAt));
}

export async function getRecentMedia(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(media).orderBy(desc(media.createdAt)).limit(limit);
}

export async function createMedia(data: InsertMedia) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(media).values(data);
  return result[0].insertId;
}

export async function deleteMedia(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(media).where(eq(media.id, id));
}

// ─── Devotionals ─────────────────────────────────────────
export async function getDevotionals() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(devotionals).orderBy(desc(devotionals.date));
}

export async function getLatestDevotional() {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(devotionals).orderBy(desc(devotionals.date)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getDevotionalById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(devotionals).where(eq(devotionals.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createDevotional(data: InsertDevotional) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(devotionals).values(data);
  return result[0].insertId;
}

export async function updateDevotional(id: number, data: Partial<InsertDevotional>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(devotionals).set(data).where(eq(devotionals.id, id));
}

export async function deleteDevotional(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(devotionals).where(eq(devotionals.id, id));
}

// ─── Chat Messages ───────────────────────────────────────
export async function getChatMessages(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  const messages = await db.select().from(chatMessages).orderBy(desc(chatMessages.createdAt)).limit(limit);
  const allMembers = await db.select().from(memberProfiles);
  return messages.reverse().map(m => ({
    ...m,
    member: allMembers.find(mp => mp.id === m.userId) || null,
  }));
}

export async function createChatMessage(data: InsertChatMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(chatMessages).values(data);
  return result[0].insertId;
}

// ─── Suggestions ─────────────────────────────────────────
export async function getSuggestions() {
  const db = await getDb();
  if (!db) return [];
  const items = await db.select().from(suggestions).orderBy(desc(suggestions.createdAt));
  const allMembers = await db.select().from(memberProfiles);
  return items.map(s => ({
    ...s,
    member: allMembers.find(m => m.id === s.memberId) || null,
  }));
}

export async function createSuggestion(data: InsertSuggestion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(suggestions).values(data);
  return result[0].insertId;
}

export async function likeSuggestion(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(suggestions).where(eq(suggestions.id, id)).limit(1);
  if (existing.length > 0) {
    await db.update(suggestions).set({ likes: existing[0].likes + 1 }).where(eq(suggestions.id, id));
  }
}

export async function deleteSuggestion(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete associated comments first
  await db.delete(suggestionComments).where(eq(suggestionComments.suggestionId, id));
  await db.delete(suggestions).where(eq(suggestions.id, id));
}

// ─── Suggestion Comments ───────────────────────────────────────
export async function getSuggestionComments(suggestionId: number) {
  const db = await getDb();
  if (!db) return [];
  const comments = await db.select().from(suggestionComments).where(eq(suggestionComments.suggestionId, suggestionId)).orderBy(suggestionComments.createdAt);
  const allMembers = await db.select().from(memberProfiles);
  return comments.map(c => ({
    ...c,
    member: allMembers.find(m => m.id === c.memberId) || null,
  }));
}

export async function createSuggestionComment(data: InsertSuggestionComment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(suggestionComments).values(data);
  return result[0].insertId;
}

export async function deleteSuggestionComment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(suggestionComments).where(eq(suggestionComments.id, id));
}

export async function getCommentCountsForSuggestions() {
  const db = await getDb();
  if (!db) return {};
  const allComments = await db.select().from(suggestionComments);
  const counts: Record<number, number> = {};
  allComments.forEach(c => {
    counts[c.suggestionId] = (counts[c.suggestionId] || 0) + 1;
  });
  return counts;
}

// ─── Member Payments ────────────────────────────────────


export async function getPaymentsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(memberPayments).where(eq(memberPayments.userId, userId)).orderBy(desc(memberPayments.createdAt));
}

export async function getAllPayments() {
  const db = await getDb();
  if (!db) return [];
  const payments = await db.select().from(memberPayments).orderBy(desc(memberPayments.createdAt));
  const allUsers = await db.select().from(users);
  return payments.map(p => ({
    ...p,
    user: allUsers.find(u => u.id === p.userId) || null,
  }));
}

export async function recordPayment(data: InsertMemberPayment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(memberPayments).values(data);
  return result[0].insertId;
}

export async function deletePayment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(memberPayments).where(eq(memberPayments.id, id));
}

export async function getTotalPaidByUser(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ total: sql<number>`COALESCE(SUM(${memberPayments.amount}), 0)` }).from(memberPayments).where(eq(memberPayments.userId, userId));
  return result[0]?.total ?? 0;
}

export async function getAllUserPaymentSummaries() {
  const db = await getDb();
  if (!db) return [];
  const allUsers = await db.select().from(users);
  const allPayments = await db.select().from(memberPayments);
  return allUsers.map(u => {
    const userPayments = allPayments.filter(p => p.userId === u.id);
    const totalPaid = userPayments.reduce((sum, p) => sum + p.amount, 0);
    return {
      userId: u.id,
      name: u.name,
      email: u.email,
      totalPaid,
      remaining: Math.max(10000 - totalPaid, 0), // $100 = 10000 cents
      isPaidInFull: totalPaid >= 10000,
      paymentCount: userPayments.length,
    };
  });
}

// ─── User Management (Admin) ────────────────────────────

export async function setUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function setUserActive(userId: number, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ isActive }).where(eq(users.id, userId));
}

export async function getAllUsersWithStatus() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    isActive: users.isActive,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn,
  }).from(users).orderBy(users.name);
}

export async function deleteUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete related data first (no FK constraints, so manual cascade)
  await db.delete(memberPayments).where(eq(memberPayments.userId, userId));
  await db.delete(eventRsvps).where(eq(eventRsvps.userId, userId));
  await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
  await db.delete(memberProfiles).where(eq(memberProfiles.userId, userId));
  // Finally delete the user
  await db.delete(users).where(eq(users.id, userId));
}


export async function deleteMemberProfile(id: number) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database not available");

  await dbConn.delete(memberProfiles).where(eq(memberProfiles.id, id));
}
