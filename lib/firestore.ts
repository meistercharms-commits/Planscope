import { db } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { DEFAULT_NOTIFICATION_PREFS } from "@/types";
import type { NotificationPrefs } from "@/types";

// ─── Types ───

export interface UserDoc {
  id: string;
  email: string;
  provider: string;
  providerId?: string | null;
  tier: string;
  tierUpdatedAt: Date | null;
  learnEnabled: boolean;
  notificationPrefs: NotificationPrefs;
  // Stripe subscription tracking
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeSubscriptionStatus: string | null; // 'active' | 'past_due' | 'canceled' | 'unpaid' | null
  stripePriceId: string | null;
  stripeCurrentPeriodEnd: Date | null;
  subscriptionUpdatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanDoc {
  id: string;
  userId: string;
  mode: string;
  label: string | null;
  weekStart: Date;
  weekEnd: Date;
  originalDump: string;
  parsedDump: Record<string, unknown> | null;
  constraints: Record<string, unknown> | null;
  planMeta: Record<string, unknown> | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskDoc {
  id: string;
  planId: string;
  title: string;
  section: string;
  timeEstimate: string | null;
  effort: string | null;
  urgency: string | null;
  category: string | null;
  context: string | null;
  status: string;
  sortOrder: number;
  completedAt: Date | null;
  createdAt: Date;
}

export interface PlanWithTasks extends PlanDoc {
  tasks: TaskDoc[];
}

// ─── Helpers ───

function toDate(val: unknown): Date {
  if (val instanceof Timestamp) return val.toDate();
  if (val instanceof Date) return val;
  if (typeof val === "string") return new Date(val);
  return new Date();
}

function toDateOrNull(val: unknown): Date | null {
  if (val == null) return null;
  return toDate(val);
}

function docToUser(id: string, data: FirebaseFirestore.DocumentData): UserDoc {
  return {
    id,
    email: data.email || "",
    provider: data.provider || "email",
    providerId: data.providerId || null,
    tier: data.tier || "free",
    tierUpdatedAt: toDateOrNull(data.tierUpdatedAt),
    learnEnabled: data.learnEnabled ?? true,
    notificationPrefs: {
      ...DEFAULT_NOTIFICATION_PREFS,
      ...(data.notificationPrefs || {}),
    },
    stripeCustomerId: data.stripeCustomerId || null,
    stripeSubscriptionId: data.stripeSubscriptionId || null,
    stripeSubscriptionStatus: data.stripeSubscriptionStatus || null,
    stripePriceId: data.stripePriceId || null,
    stripeCurrentPeriodEnd: toDateOrNull(data.stripeCurrentPeriodEnd),
    subscriptionUpdatedAt: toDateOrNull(data.subscriptionUpdatedAt),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

// ─── Stripe Helpers ───

export async function getUserByStripeCustomerId(
  customerId: string
): Promise<{ uid: string; user: UserDoc } | null> {
  const snap = await db
    .collection("users")
    .where("stripeCustomerId", "==", customerId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { uid: doc.id, user: docToUser(doc.id, doc.data()) };
}

function docToPlan(
  id: string,
  data: FirebaseFirestore.DocumentData
): PlanDoc {
  return {
    id,
    userId: data.userId || "",
    mode: data.mode || "week",
    label: data.label || null,
    weekStart: toDate(data.weekStart),
    weekEnd: toDate(data.weekEnd),
    originalDump: data.originalDump || "",
    parsedDump: data.parsedDump || null,
    constraints: data.constraints || null,
    planMeta: data.planMeta || null,
    status: data.status || "active",
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function docToTask(
  id: string,
  planId: string,
  data: FirebaseFirestore.DocumentData
): TaskDoc {
  return {
    id,
    planId,
    title: data.title || "",
    section: data.section || "this_week",
    timeEstimate: data.timeEstimate || null,
    effort: data.effort || null,
    urgency: data.urgency || null,
    category: data.category || null,
    context: data.context || null,
    status: data.status || "pending",
    sortOrder: data.sortOrder ?? 0,
    completedAt: toDateOrNull(data.completedAt),
    createdAt: toDate(data.createdAt),
  };
}

// ─── User Operations ───

export async function getUser(uid: string): Promise<UserDoc | null> {
  const doc = await db.collection("users").doc(uid).get();
  if (!doc.exists) return null;
  return docToUser(uid, doc.data()!);
}

export async function getUserByEmail(
  email: string
): Promise<{ uid: string; user: UserDoc } | null> {
  const snap = await db
    .collection("users")
    .where("email", "==", email)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { uid: doc.id, user: docToUser(doc.id, doc.data()) };
}

export async function createUser(
  uid: string,
  data: Partial<UserDoc>
): Promise<void> {
  await db
    .collection("users")
    .doc(uid)
    .set({
      email: data.email || "",
      provider: data.provider || "email",
      providerId: data.providerId || null,
      tier: data.tier || "free",
      tierUpdatedAt: data.tierUpdatedAt || null,
      learnEnabled: data.learnEnabled ?? true,
      notificationPrefs: data.notificationPrefs || { ...DEFAULT_NOTIFICATION_PREFS },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
}

export async function updateUser(
  uid: string,
  data: Record<string, unknown>
): Promise<void> {
  await db
    .collection("users")
    .doc(uid)
    .update({
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    });
}

export async function deleteUserAndData(uid: string): Promise<void> {
  // 1. Get all plans for this user
  const plansSnap = await db
    .collection("plans")
    .where("userId", "==", uid)
    .get();

  const batch = db.batch();

  // 2. For each plan, delete all tasks
  for (const planDoc of plansSnap.docs) {
    const tasksSnap = await planDoc.ref.collection("tasks").get();
    for (const taskDoc of tasksSnap.docs) {
      batch.delete(taskDoc.ref);
    }
    batch.delete(planDoc.ref);
  }

  // 3. Delete user document
  batch.delete(db.collection("users").doc(uid));

  await batch.commit();
}

// ─── Plan Operations ───

export async function getActivePlans(
  userId: string
): Promise<PlanWithTasks[]> {
  // Get current week start (Sunday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);

  const snap = await db
    .collection("plans")
    .where("userId", "==", userId)
    .where("status", "in", ["active", "review"])
    .where("weekStart", ">=", Timestamp.fromDate(weekStart))
    .orderBy("weekStart")
    .orderBy("createdAt", "desc")
    .get();

  const plans: PlanWithTasks[] = [];
  for (const doc of snap.docs) {
    const plan = docToPlan(doc.id, doc.data());
    const tasks = await getTasksForPlan(doc.id);
    plans.push({ ...plan, tasks });
  }
  return plans;
}

export async function getPlanHistory(
  userId: string,
  limit = 50
): Promise<PlanWithTasks[]> {
  const snap = await db
    .collection("plans")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  const plans: PlanWithTasks[] = [];
  for (const doc of snap.docs) {
    const plan = docToPlan(doc.id, doc.data());
    const tasks = await getTasksForPlan(doc.id);
    plans.push({ ...plan, tasks });
  }
  return plans;
}

export async function getPlan(
  planId: string,
  userId: string
): Promise<PlanWithTasks | null> {
  const doc = await db.collection("plans").doc(planId).get();
  if (!doc.exists) return null;

  const data = doc.data()!;
  if (data.userId !== userId) return null;

  const plan = docToPlan(doc.id, data);
  const tasks = await getTasksForPlan(planId);
  return { ...plan, tasks };
}

export async function createPlanWithTasks(input: {
  userId: string;
  mode: string;
  label?: string | null;
  weekStart: Date;
  weekEnd: Date;
  originalDump: string;
  parsedDump?: Record<string, unknown> | null;
  constraints?: Record<string, unknown> | null;
  planMeta?: Record<string, unknown> | null;
  status: string;
  tasks: Array<{
    title: string;
    section: string;
    timeEstimate?: string | null;
    effort?: string | null;
    urgency?: string | null;
    category?: string | null;
    context?: string | null;
    status?: string;
    sortOrder: number;
  }>;
}): Promise<string> {
  const planRef = db.collection("plans").doc();
  const batch = db.batch();

  batch.set(planRef, {
    userId: input.userId,
    mode: input.mode,
    label: input.label || null,
    weekStart: Timestamp.fromDate(input.weekStart),
    weekEnd: Timestamp.fromDate(input.weekEnd),
    originalDump: input.originalDump,
    parsedDump: input.parsedDump || null,
    constraints: input.constraints || null,
    planMeta: input.planMeta || null,
    status: input.status,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  for (const task of input.tasks) {
    const taskRef = planRef.collection("tasks").doc();
    batch.set(taskRef, {
      title: task.title,
      section: task.section,
      timeEstimate: task.timeEstimate || null,
      effort: task.effort || null,
      urgency: task.urgency || null,
      category: task.category || null,
      context: task.context || null,
      status: task.status || "pending",
      sortOrder: task.sortOrder,
      completedAt: null,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
  return planRef.id;
}

export async function updatePlan(
  planId: string,
  data: Record<string, unknown>
): Promise<void> {
  await db
    .collection("plans")
    .doc(planId)
    .update({
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    });
}

export async function getMonthlyPlanCount(
  userId: string
): Promise<number> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const snap = await db
    .collection("plans")
    .where("userId", "==", userId)
    .where("createdAt", ">=", Timestamp.fromDate(monthStart))
    .where("createdAt", "<", Timestamp.fromDate(monthEnd))
    .get();

  return snap.size;
}

export async function getActiveWeekPlanCount(
  userId: string
): Promise<number> {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);

  const snap = await db
    .collection("plans")
    .where("userId", "==", userId)
    .where("status", "in", ["active", "review"])
    .where("weekStart", ">=", Timestamp.fromDate(weekStart))
    .get();

  return snap.size;
}

// ─── Task Operations ───

async function getTasksForPlan(planId: string): Promise<TaskDoc[]> {
  const snap = await db
    .collection("plans")
    .doc(planId)
    .collection("tasks")
    .orderBy("sortOrder")
    .get();

  return snap.docs.map((doc) => docToTask(doc.id, planId, doc.data()));
}

export async function createTask(
  planId: string,
  data: {
    title: string;
    section: string;
    timeEstimate?: string | null;
    effort?: string | null;
    urgency?: string | null;
    category?: string | null;
    context?: string | null;
    status?: string;
    sortOrder: number;
  }
): Promise<TaskDoc> {
  const taskRef = db
    .collection("plans")
    .doc(planId)
    .collection("tasks")
    .doc();

  const taskData = {
    title: data.title,
    section: data.section,
    timeEstimate: data.timeEstimate || null,
    effort: data.effort || "medium",
    urgency: data.urgency || null,
    category: data.category || "other",
    context: data.context || null,
    status: data.status || "pending",
    sortOrder: data.sortOrder,
    completedAt: null,
    createdAt: FieldValue.serverTimestamp(),
  };

  await taskRef.set(taskData);

  return {
    id: taskRef.id,
    planId,
    title: taskData.title,
    section: taskData.section,
    timeEstimate: taskData.timeEstimate,
    effort: taskData.effort,
    urgency: null,
    category: taskData.category,
    context: null,
    status: taskData.status,
    sortOrder: taskData.sortOrder,
    completedAt: null,
    createdAt: new Date(),
  };
}

export async function updateTask(
  planId: string,
  taskId: string,
  data: Record<string, unknown>
): Promise<void> {
  await db
    .collection("plans")
    .doc(planId)
    .collection("tasks")
    .doc(taskId)
    .update(data);
}

export async function deleteTask(
  planId: string,
  taskId: string
): Promise<void> {
  await db
    .collection("plans")
    .doc(planId)
    .collection("tasks")
    .doc(taskId)
    .delete();
}

export async function getTask(
  planId: string,
  taskId: string
): Promise<TaskDoc | null> {
  const doc = await db
    .collection("plans")
    .doc(planId)
    .collection("tasks")
    .doc(taskId)
    .get();

  if (!doc.exists) return null;
  return docToTask(doc.id, planId, doc.data()!);
}

export async function getActiveTaskCount(
  planId: string
): Promise<number> {
  const snap = await db
    .collection("plans")
    .doc(planId)
    .collection("tasks")
    .where("section", "in", ["do_first", "this_week"])
    .get();

  return snap.size;
}

// ─── Export Operations ───

export async function getUserWithAllPlans(userId: string): Promise<{
  user: UserDoc;
  plans: PlanWithTasks[];
} | null> {
  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) return null;

  const user = docToUser(userId, userDoc.data()!);

  const plansSnap = await db
    .collection("plans")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();

  const plans: PlanWithTasks[] = [];
  for (const doc of plansSnap.docs) {
    const plan = docToPlan(doc.id, doc.data());
    const tasks = await getTasksForPlan(doc.id);
    plans.push({ ...plan, tasks });
  }

  return { user, plans };
}

// ─── Learnings Helpers ───

export async function getRecentPlansWithTasks(
  userId: string,
  limit = 4
): Promise<PlanWithTasks[]> {
  const snap = await db
    .collection("plans")
    .where("userId", "==", userId)
    .where("status", "in", ["active", "completed"])
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  const plans: PlanWithTasks[] = [];
  for (const doc of snap.docs) {
    const plan = docToPlan(doc.id, doc.data());
    const tasks = await getTasksForPlan(doc.id);
    plans.push({ ...plan, tasks });
  }
  return plans;
}
