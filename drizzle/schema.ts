import { mysqlTable, mysqlSchema, AnyMySqlColumn, primaryKey, int, text, timestamp, varchar, mysqlEnum, mediumtext, tinyint, unique } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const chatMessages = mysqlTable("chat_messages", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	content: text().notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`(now())`).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "chat_messages_id"}),
]);

export const devotionals = mysqlTable("devotionals", {
	id: int().autoincrement().notNull(),
	title: varchar({ length: 255 }).notNull(),
	scripture: text(),
	scriptureReference: varchar({ length: 128 }),
	content: text().notNull(),
	date: timestamp({ mode: 'string' }).notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`(now())`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`(now())`).onUpdateNow().notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "devotionals_id"}),
]);

export const eventRsvps = mysqlTable("event_rsvps", {
	id: int().autoincrement().notNull(),
	eventId: int().notNull(),
	userId: int().notNull(),
	status: mysqlEnum(['going','maybe','cant_make_it']).notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`(now())`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`(now())`).onUpdateNow().notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "event_rsvps_id"}),
]);

export const events = mysqlTable("events", {
	id: int().autoincrement().notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	date: timestamp({ mode: 'string' }).notNull(),
	endDate: timestamp({ mode: 'string' }),
	location: varchar({ length: 255 }),
	type: mysqlEnum(['rehearsal','service','special','other']).default('other').notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`(now())`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`(now())`).onUpdateNow().notNull(),
	imageUrl: text(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "events_id"}),
]);

export const media = mysqlTable("media", {
	id: int().autoincrement().notNull(),
	url: text().notNull(),
	thumbnailUrl: text(),
	type: mysqlEnum(['photo','video']).default('photo').notNull(),
	caption: text(),
	uploadedBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`(now())`).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "media_id"}),
]);

export const memberPayments = mysqlTable("member_payments", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	amount: int().notNull(),
	note: text(),
	recordedBy: int().notNull(),
	paymentMethod: varchar({ length: 64 }),
	createdAt: timestamp({ mode: 'string' }).default(sql`(now())`).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "member_payments_id"}),
]);

export const memberProfiles = mysqlTable("member_profiles", {
	id: int().autoincrement().notNull(),
	userId: int(),
	instrument: varchar({ length: 128 }),
	phone: varchar({ length: 32 }),
	bio: text(),
	avatarUrl: text(),
	createdAt: timestamp({ mode: 'string' }).default(sql`(now())`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`(now())`).onUpdateNow().notNull(),
	name: varchar({ length: 255 }).notNull(),
	memberRole: varchar({ length: 128 }),
	voiceType: varchar({ length: 64 }),
	interests: text(),
	profileImageUrl: mediumtext(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "member_profiles_id"}),
]);

export const setlistSongs = mysqlTable("setlist_songs", {
	id: int().autoincrement().notNull(),
	setlistId: int().notNull(),
	songId: int().notNull(),
	orderIndex: int().default(0).notNull(),
	notes: text(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "setlist_songs_id"}),
]);

export const setlists = mysqlTable("setlists", {
	id: int().autoincrement().notNull(),
	title: varchar({ length: 255 }).notNull(),
	eventId: int(),
	date: timestamp({ mode: 'string' }),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`(now())`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`(now())`).onUpdateNow().notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "setlists_id"}),
]);

export const songs = mysqlTable("songs", {
	id: int().autoincrement().notNull(),
	title: varchar({ length: 255 }).notNull(),
	artist: varchar({ length: 255 }),
	songKey: varchar({ length: 16 }),
	tempo: int(),
	lyrics: text(),
	notes: text(),
	youtubeUrl: text(),
	spotifyUrl: text(),
	// spotifyUrl: text(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`(now())`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`(now())`).onUpdateNow().notNull(),
	audioUrl: text(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "songs_id"}),
]);

export const suggestionComments = mysqlTable("suggestion_comments", {
	id: int().autoincrement().notNull(),
	suggestionId: int().notNull(),
	memberId: int().notNull(),
	content: text().notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`(now())`).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "suggestion_comments_id"}),
]);

export const suggestions = mysqlTable("suggestions", {
	id: int().autoincrement().notNull(),
	memberId: int().notNull(),
	category: mysqlEnum(['song','venue','event','general']).default('general').notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	likes: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`(now())`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`(now())`).onUpdateNow().notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "suggestions_id"}),
]);

export const users = mysqlTable("users", {
	id: int().autoincrement().notNull(),
	openId: varchar({ length: 64 }).notNull(),
	name: text(),
	email: varchar({ length: 320 }),
	loginMethod: varchar({ length: 64 }),
	role: mysqlEnum(['user','admin']).default('user').notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`(now())`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`(now())`).onUpdateNow().notNull(),
	lastSignedIn: timestamp({ mode: 'string' }).default(sql`(now())`).notNull(),
	isActive: tinyint().default(1).notNull(),
	passwordHash: text(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "users_id"}),
	unique("users_email_unique").on(table.email),
	unique("users_openId_unique").on(table.openId),
]);
