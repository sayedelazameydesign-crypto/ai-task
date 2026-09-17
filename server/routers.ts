import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createTools, runAgent } from "./agent";
import { listMemories } from "./db";
import { cancelTask, createTask, getTask, getTaskEvents, listApprovals, listTasks, pauseTask, requestApproval, resolveApproval, resumeTask, retryTask } from "./task-service";
import { assertCalendarApproval, calendarCreate, calendarDelete, calendarFreebusy, calendarGet, calendarList, calendarSearch, calendarUpdate, driveGetText, driveList, driveSearch, googleCalendarConfigured, saveGoogleCredentials, sheetsGetValues } from "./google-calendar";

const messageInput = z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(12000) });
const taskIdInput = z.object({ id: z.number().int().positive() });

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  chat: router({
    send: publicProcedure.input(z.object({ messages: z.array(messageInput).min(1).max(24) })).mutation(async ({ input, ctx }) => runAgent({ userId: ctx.user?.id ?? 0, messages: input.messages })),
    memories: publicProcedure.query(({ ctx }) => listMemories(ctx.user?.id ?? 0)),
    capabilities: publicProcedure.query(() => createTools().map(tool => ({ name: tool.name, description: tool.description, riskLevel: tool.riskLevel, requiresConfirmation: tool.requiresConfirmation }))),
  }),
  tasks: router({
    list: publicProcedure.query(({ ctx }) => listTasks(ctx.user?.id ?? 0)),
    get: publicProcedure.input(taskIdInput).query(({ input }) => getTask(input.id)),
    events: publicProcedure.input(taskIdInput).query(({ input }) => getTaskEvents(input.id)),
    approvals: publicProcedure.input(taskIdInput).query(({ input, ctx }) => listApprovals({ taskId: input.id, userId: ctx.user?.id ?? 0 })),
    create: publicProcedure.input(z.object({ goal: z.string().min(3).max(4000), messages: z.array(messageInput).min(1).max(24), idempotencyKey: z.string().max(160).optional() })).mutation(({ input, ctx }) => createTask({ userId: ctx.user?.id ?? 0, goal: input.goal, messages: input.messages, idempotencyKey: input.idempotencyKey })),
    pause: publicProcedure.input(taskIdInput).mutation(({ input }) => pauseTask(input.id)),
    resume: publicProcedure.input(taskIdInput).mutation(({ input }) => resumeTask(input.id)),
    cancel: publicProcedure.input(taskIdInput).mutation(({ input }) => cancelTask(input.id)),
    retry: publicProcedure.input(taskIdInput).mutation(({ input }) => retryTask(input.id)),
    requestApproval: publicProcedure.input(z.object({ taskId: z.number().int().positive(), toolName: z.string().min(1), action: z.string().min(1), riskLevel: z.enum(["low", "medium", "high"]).default("high"), requiredPermission: z.string().max(160).optional(), resourceScope: z.string().max(300).optional() })).mutation(({ input, ctx }) => requestApproval({ ...input, userId: ctx.user?.id ?? 0 })),
    resolveApproval: publicProcedure.input(z.object({ id: z.number().int().positive(), taskId: z.number().int().positive(), status: z.enum(["approved", "rejected"]) })).mutation(({ input, ctx }) => resolveApproval({ ...input, userId: ctx.user?.id ?? 0 })),
  }),
  calendar: router({
    status: publicProcedure.query(async () => ({ configured: await googleCalendarConfigured(), permissions: { read: "calendar.read", create: "calendar.create", update: "calendar.update", delete: "calendar.delete" } })),
    list: publicProcedure.input(z.object({ calendarId: z.string().default("primary"), timeMin: z.string().optional(), timeMax: z.string().optional() })).query(({ input, ctx }) => calendarList(ctx.user?.id ?? 0, input)),
    get: publicProcedure.input(z.object({ eventId: z.string().min(1), calendarId: z.string().default("primary") })).query(({ input, ctx }) => calendarGet(ctx.user?.id ?? 0, input.eventId, input.calendarId)),
    search: publicProcedure.input(z.object({ q: z.string().min(1), calendarId: z.string().default("primary") })).query(({ input, ctx }) => calendarSearch(ctx.user?.id ?? 0, input.q, input.calendarId)),
    freebusy: publicProcedure.input(z.object({ timeMin: z.string(), timeMax: z.string(), calendarIds: z.array(z.string()).default(["primary"]) })).query(({ input, ctx }) => calendarFreebusy(ctx.user?.id ?? 0, input.timeMin, input.timeMax, input.calendarIds)),
    create: publicProcedure.input(z.object({ event: z.record(z.string(), z.unknown()), calendarId: z.string().default("primary"), approvalId: z.number().int().positive() })).mutation(async ({ input, ctx }) => { await assertCalendarApproval({ approvalId: input.approvalId, userId: ctx.user?.id ?? 0, permission: "calendar.create" }); return calendarCreate(ctx.user?.id ?? 0, input.event, input.calendarId); }),
    update: publicProcedure.input(z.object({ eventId: z.string().min(1), event: z.record(z.string(), z.unknown()), calendarId: z.string().default("primary"), approvalId: z.number().int().positive() })).mutation(async ({ input, ctx }) => { await assertCalendarApproval({ approvalId: input.approvalId, userId: ctx.user?.id ?? 0, permission: "calendar.update" }); return calendarUpdate(ctx.user?.id ?? 0, input.eventId, input.event, input.calendarId); }),
    delete: publicProcedure.input(z.object({ eventId: z.string().min(1), calendarId: z.string().default("primary"), approvalId: z.number().int().positive() })).mutation(async ({ input, ctx }) => { await assertCalendarApproval({ approvalId: input.approvalId, userId: ctx.user?.id ?? 0, permission: "calendar.delete" }); return calendarDelete(ctx.user?.id ?? 0, input.eventId, input.calendarId); }),
  }),
  integrations: router({
    googleStatus: adminProcedure.query(async () => ({ configured: await googleCalendarConfigured(), provider: "Google Workspace", scopes: ["calendar.read", "calendar.create", "calendar.update", "calendar.delete", "drive.read", "sheets.read"] })),
    saveGoogle: adminProcedure.input(z.object({ clientId: z.string().min(10).max(300), clientSecret: z.string().min(8).max(300) })).mutation(({ input }) => saveGoogleCredentials(input)),
  }),
  google: router({
    driveList: protectedProcedure.input(z.object({ pageSize: z.number().int().min(1).max(100).default(20) })).query(({ input, ctx }) => driveList(ctx.user.id, input.pageSize)),
    driveSearch: protectedProcedure.input(z.object({ query: z.string().min(1).max(200), pageSize: z.number().int().min(1).max(100).default(20) })).query(({ input, ctx }) => driveSearch(ctx.user.id, input.query, input.pageSize)),
    driveRead: protectedProcedure.input(z.object({ fileId: z.string().min(1).max(200), mimeType: z.string().max(200).optional() })).query(({ input, ctx }) => driveGetText(ctx.user.id, input.fileId, input.mimeType)),
    sheetsValues: protectedProcedure.input(z.object({ spreadsheetId: z.string().min(1).max(200), range: z.string().min(1).max(500) })).query(({ input, ctx }) => sheetsGetValues(ctx.user.id, input.spreadsheetId, input.range)),
  }),
});

export type AppRouter = typeof appRouter;
