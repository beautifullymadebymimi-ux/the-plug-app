import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sdk } from "./_core/sdk";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { storagePut } from "./storage";
import { notifyOwner } from "./_core/notification";

export const appRouter = router({
  system: systemRouter,

  auth: router({
  me: publicProcedure.query((opts) => opts.ctx.user),

  signup: publicProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      email: z.string().email(),
      password: z.string().min(6).max(100),
    }))
    .mutation(async ({ input, ctx }) => {
      const existing = await db.getUserByEmail(input.email.toLowerCase());
      if (existing) {
        throw new Error("An account with that email already exists.");
      }

      const passwordHash = await bcrypt.hash(input.password, 10);
      const openId = `local_${crypto.randomUUID()}`;

      await db.createUser({
        openId,
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash,
        loginMethod: "email",
        role: "user",
        lastSignedIn: new Date(),
        isActive: true,
      });

      const user = await db.getUserByEmail(input.email.toLowerCase());
      if (!user) {
        throw new Error("Failed to create user.");
      }

      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || "",
      });

      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

      return { user };
    }),

  login: publicProcedure
  .input(z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }))
  .mutation(async ({ input, ctx }) => {
    const user = await db.getUserByEmail(input.email.toLowerCase());
    if (!user || !user.passwordHash) {
      throw new Error("Invalid email or password.");
    }

    const isValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValid) {
      throw new Error("Invalid email or password.");
    }

    await db.upsertUser({
      openId: user.openId,
      lastSignedIn: new Date(),
    });

    const sessionToken = await sdk.createSessionToken(user.openId, {
      name: user.name || "",
    });

    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

    return { user };
  }),

  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),
}),
  members: router({
    list: publicProcedure.query(() => db.getAllMemberProfiles()),
    byId: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getMemberProfile(input.id)),
    signup: publicProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        role: z.string().optional(),
        instrument: z.string().optional(),
        voiceType: z.string().optional(),
        interests: z.string().optional(),
        phone: z.string().optional(),
        bio: z.string().optional(),
        profileImageBase64: z.string().optional(),
        profileImageMimeType: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        let profileImageUrl: string | undefined;
      if (input.profileImageBase64) {
  profileImageUrl = `data:${input.profileImageMimeType || "image/jpeg"};base64,${input.profileImageBase64}`;
}
        const memberId = await db.createMemberProfile({
          name: input.name,
          role: input.role || undefined,
          instrument: input.instrument || undefined,
          voiceType: input.voiceType || undefined,
          interests: input.interests || undefined,
          profileImageUrl,
          phone: input.phone || undefined,
          bio: input.bio || undefined,
        });

        // Send notification to app owner about new member signup
        try {
          await notifyOwner({
            title: `New Member Signup: ${input.name}`,
            content: `A new member has signed up for The Plug Worship!\n\nName: ${input.name}\nRole: ${input.role || "Not specified"}\nInstrument: ${input.instrument || "Not specified"}\nVoice Type: ${input.voiceType || "Not specified"}\nInterests: ${input.interests || "Not specified"}\n\nPlease check the app for more details.`,
          });
        } catch (err) {
          console.warn("[Notification] Failed to send new member notification:", err);
        }

        return memberId;
      }),
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        role: z.string().optional(),
        instrument: z.string().optional(),
        voiceType: z.string().optional(),
        interests: z.string().optional(),
        phone: z.string().optional(),
        bio: z.string().optional(),
        profileImageBase64: z.string().optional(),
        profileImageMimeType: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, profileImageBase64, profileImageMimeType, ...data } = input;
        const updateData: Record<string, unknown> = { ...data };
if (profileImageBase64) {
  updateData.profileImageUrl =
    `data:${profileImageMimeType || "image/jpeg"};base64,${profileImageBase64}`;
}
        return db.updateMemberProfile(id, updateData);
      }),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteMemberProfile(input.id);
        return { success: true };
      }),
  }),

  events: router({
    list: publicProcedure.query(() => db.getEvents()),
    upcoming: publicProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(({ input }) => db.getUpcomingEvents(input?.limit)),
    byId: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getEventById(input.id)),
    create: publicProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        date: z.string(),
        endDate: z.string().optional(),
        location: z.string().optional(),
        type: z.enum(["rehearsal", "service", "special", "other"]).default("other"),
        imageBase64: z.string().optional(),
        imageMimeType: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
  let imageUrl: string | undefined = undefined;

  return db.createEvent({
    title: input.title,
    description: input.description,
    date: new Date(input.date),
    endDate: input.endDate ? new Date(input.endDate) : undefined,
    location: input.location,
    type: input.type,
    imageUrl,
    createdBy: 0,
  });
}),
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        date: z.string().optional(),
        endDate: z.string().optional(),
        location: z.string().optional(),
        type: z.enum(["rehearsal", "service", "special", "other"]).optional(),
      }))
      .mutation(({ input }) => {
        const { id, ...data } = input;
        const updateData: Record<string, unknown> = { ...data };
        if (data.date) updateData.date = new Date(data.date);
        if (data.endDate) updateData.endDate = new Date(data.endDate);
        return db.updateEvent(id, updateData as any);
      }),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteEvent(input.id)),
    rsvps: publicProcedure
      .input(z.object({ eventId: z.number() }))
      .query(({ input }) => db.getEventRsvps(input.eventId)),
    rsvp: publicProcedure
      .input(z.object({
        eventId: z.number(),
        status: z.enum(["going", "maybe", "cant_make_it"]),
      }))
      .mutation(({ input }) => db.upsertRsvp({
        eventId: input.eventId,
        userId: 0,
        status: input.status,
      })),
  }),

  songs: router({
    list: publicProcedure.query(() => db.getSongs()),
    byId: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getSongById(input.id)),
    create: publicProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        artist: z.string().optional(),
        songKey: z.string().optional(),
        tempo: z.number().optional(),
        lyrics: z.string().optional(),
        notes: z.string().optional(),
        youtubeUrl: z.string().optional(),
        spotifyUrl: z.string().optional(),
        audioUrl: z.string().optional(),
      }))
      .mutation(({ input }) => db.createSong({ ...input, createdBy: 0 })),
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        artist: z.string().optional(),
        songKey: z.string().optional(),
        tempo: z.number().optional(),
        lyrics: z.string().optional(),
        notes: z.string().optional(),
        youtubeUrl: z.string().optional(),
        spotifyUrl: z.string().optional(),
        audioUrl: z.string().nullable().optional(),
      }))
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return db.updateSong(id, data);
      }),
    uploadAudio: publicProcedure
      .input(z.object({
        songId: z.number(),
        fileBase64: z.string(),
        fileName: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.fileBase64, "base64");
        const randomSuffix = Math.random().toString(36).substring(2, 10);
        const fileKey = `songs/audio/${input.songId}-${randomSuffix}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        await db.updateSong(input.songId, { audioUrl: url });
        return { audioUrl: url };
      }),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteSong(input.id)),
  }),

  setlists: router({
    list: publicProcedure.query(() => db.getSetlists()),
    byId: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getSetlistById(input.id)),
    create: publicProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        eventId: z.number().optional(),
        date: z.string().optional(),
      }))
      .mutation(({ input }) => db.createSetlist({
        ...input,
        date: input.date ? new Date(input.date) : undefined,
        createdBy: 0,
      })),
    songs: publicProcedure
      .input(z.object({ setlistId: z.number() }))
      .query(({ input }) => db.getSetlistSongs(input.setlistId)),
    addSong: publicProcedure
      .input(z.object({
        setlistId: z.number(),
        songId: z.number(),
        orderIndex: z.number().default(0),
        notes: z.string().optional(),
      }))
      .mutation(({ input }) => db.addSongToSetlist(input)),
    removeSong: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.removeSongFromSetlist(input.id)),
  }),

  media: router({
    list: publicProcedure.query(() => db.getMedia()),
    recent: publicProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(({ input }) => db.getRecentMedia(input?.limit)),
    upload: publicProcedure
      .input(z.object({
        fileBase64: z.string(),
        fileName: z.string(),
        mimeType: z.string(),
        caption: z.string().optional(),
        type: z.enum(["photo", "video"]).default("photo"),
      }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.fileBase64, "base64");
        const randomSuffix = Math.random().toString(36).substring(2, 10);
        const fileKey = `media/guest/${randomSuffix}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        const mediaId = await db.createMedia({
          url,
          type: input.type,
          caption: input.caption,
          uploadedBy: 0,
        });
        return { id: mediaId, url };
      }),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteMedia(input.id)),
  }),

  devotionals: router({
    list: publicProcedure.query(() => db.getDevotionals()),
    latest: publicProcedure.query(() => db.getLatestDevotional()),
    byId: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getDevotionalById(input.id)),
    create: publicProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        scripture: z.string().optional(),
        scriptureReference: z.string().optional(),
        content: z.string().min(1),
        date: z.string(),
      }))
      .mutation(({ input }) => db.createDevotional({
        ...input,
        date: new Date(input.date),
        createdBy: 0,
      })),
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        scripture: z.string().optional(),
        scriptureReference: z.string().optional(),
        content: z.string().optional(),
        date: z.string().optional(),
      }))
      .mutation(({ input }) => {
        const { id, ...data } = input;
        const updateData: Record<string, unknown> = { ...data };
        if (data.date) updateData.date = new Date(data.date);
        return db.updateDevotional(id, updateData as any);
      }),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteDevotional(input.id)),
  }),

  chat: router({
    messages: publicProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(({ input }) => db.getChatMessages(input?.limit)),
    send: publicProcedure
      .input(z.object({ content: z.string().min(1), memberId: z.number() }))
      .mutation(({ input }) => db.createChatMessage({
        userId: input.memberId,
        content: input.content,
      })),
  }),

  suggestions: router({
    list: publicProcedure.query(async () => {
      const items = await db.getSuggestions();
      const commentCounts = await db.getCommentCountsForSuggestions();
      return items.map(s => ({ ...s, commentCount: commentCounts[s.id] || 0 }));
    }),
    create: publicProcedure
      .input(z.object({
        memberId: z.number(),
        category: z.enum(["song", "venue", "event", "general"]).default("general"),
        title: z.string().min(1).max(255),
        description: z.string().optional(),
      }))
      .mutation(({ input }) => db.createSuggestion(input)),
    like: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.likeSuggestion(input.id)),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteSuggestion(input.id)),
    comments: publicProcedure
      .input(z.object({ suggestionId: z.number() }))
      .query(({ input }) => db.getSuggestionComments(input.suggestionId)),
    addComment: publicProcedure
      .input(z.object({
        suggestionId: z.number(),
        memberId: z.number(),
        content: z.string().min(1),
      }))
      .mutation(({ input }) => db.createSuggestionComment(input)),
    deleteComment: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteSuggestionComment(input.id)),
  }),

  home: router({
    feed: publicProcedure.query(async () => {
      let upcomingEvents = [];
      let latestDevotional = null;
      let recentMedia = [];

      try {
        upcomingEvents = await db.getUpcomingEvents(3);
      } catch (error) {
        console.error("[home.feed] upcomingEvents failed:", error);
      }

      try {
        latestDevotional = await db.getLatestDevotional();
      } catch (error) {
        console.error("[home.feed] latestDevotional failed:", error);
      }

      try {
        recentMedia = await db.getRecentMedia(6);
      } catch (error) {
        console.error("[home.feed] recentMedia failed:", error);
      }

      return { upcomingEvents, latestDevotional, recentMedia };
    }),
  }),

  userManagement: router({
    list: adminProcedure.query(async () => {
      return db.getAllUsersWithStatus();
    }),
    setRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(["user", "admin"]),
      }))
      .mutation(async ({ input, ctx }) => {
        // Prevent admin from demoting themselves
        if (input.userId === ctx.user.id && input.role === "user") {
          throw new Error("You cannot remove your own admin access");
        }
        await db.setUserRole(input.userId, input.role);
        return { success: true };
      }),
    setActive: adminProcedure
      .input(z.object({
        userId: z.number(),
        isActive: z.boolean(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Prevent admin from deactivating themselves
        if (input.userId === ctx.user.id && !input.isActive) {
          throw new Error("You cannot deactivate your own account");
        }
        await db.setUserActive(input.userId, input.isActive);
        return { success: true };
      }),
    deleteUser: adminProcedure
      .input(z.object({
        userId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Prevent admin from deleting themselves
        if (input.userId === ctx.user.id) {
          throw new Error("You cannot delete your own account");
        }
        await db.deleteUser(input.userId);
        return { success: true };
      }),
  }),

  payments: router({
    myPayments: protectedProcedure.query(async ({ ctx }) => {
      return db.getPaymentsForUser(ctx.user.id);
    }),
    myTotal: protectedProcedure.query(async ({ ctx }) => {
      const total = await db.getTotalPaidByUser(ctx.user.id);
      return {
        totalPaid: total,
        totalDue: 15000,
        remaining: Math.max(15000 - total, 0),
        isPaidInFull: total >= 15000,
      };
    }),
    allSummaries: adminProcedure.query(async () => {
      return db.getAllUserPaymentSummaries();
    }),
    allPayments: adminProcedure.query(async () => {
      return db.getAllPayments();
    }),
    record: adminProcedure
      .input(z.object({
        userId: z.number(),
        amount: z.number().min(1),
        note: z.string().optional(),
        paymentMethod: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.recordPayment({
          userId: input.userId,
          amount: input.amount,
          note: input.note || null,
          recordedBy: ctx.user.id,
          paymentMethod: input.paymentMethod || null,
        });
        return { id };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deletePayment(input.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
