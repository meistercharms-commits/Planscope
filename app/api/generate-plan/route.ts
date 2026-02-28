import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getAuthOrAnon } from "@/lib/auth";
import { generateFullPlan } from "@/lib/llm";
import { getUser, getPlan, createPlanWithTasks } from "@/lib/firestore";
import { rateLimit } from "@/lib/rate-limit";
import { canCreatePlan, canCreateAdditionalPlan, getUserTier, canUseRecurring } from "@/lib/tiers";
import { PlanMeta } from "@/types";
import { generateLearningSummary } from "@/lib/learnings";
import { getTargetWeek } from "@/lib/week-dates";

// Allow up to 60 seconds for this route (LLM calls take time)
export const maxDuration = 60;

// Per-user lock to prevent concurrent plan generation (closes TOCTOU race window)
const generationLocks = new Set<string>();

export async function POST(req: NextRequest) {
  try {
    // Allow both authenticated and anonymous users to generate plans
    // Only authenticated users can save them
    let auth: { userId: string; isAnon: boolean };
    try {
      auth = await getAuthOrAnon();
    } catch {
      // No session - create temporary anonymous ID for generation only
      // User will need to sign in to save the plan
      const randomId = randomBytes(8).toString("hex");
      auth = { userId: `anon-${randomId}`, isAnon: true };
    }

    // Rate limit — stricter for anonymous users to protect API costs
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const rateLimitKey = auth.isAnon ? `plan-anon:${ip}` : `plan:${auth.userId}`;
    const maxRequests = auth.isAnon ? 3 : 10;
    if (!rateLimit(rateLimitKey, { maxRequests, windowMs: 60 * 60 * 1000 })) {
      return NextResponse.json(
        { error: "Too many plan requests. Please try again later." },
        { status: 429 }
      );
    }

    // Prevent concurrent plan generation for the same user (closes TOCTOU race)
    if (!auth.isAnon && generationLocks.has(auth.userId)) {
      return NextResponse.json(
        { error: "A plan is already being generated. Please wait." },
        { status: 429 }
      );
    }
    if (!auth.isAnon) generationLocks.add(auth.userId);

    try {

    // Skip tier checks for anonymous users (they can only generate, not save)
    let planCheck: Awaited<ReturnType<typeof canCreatePlan>> = { allowed: true, remaining: Infinity, limit: Infinity };

    if (!auth.isAnon) {
      // Check plan creation limit
      planCheck = await canCreatePlan(auth.userId);
      if (!planCheck.allowed) {
        return NextResponse.json(
          { error: planCheck.message || "Plan limit reached", code: "PLAN_LIMIT_REACHED" },
          { status: 403 }
        );
      }

      // Check active plan limit for this week
      const activePlanCheck = await canCreateAdditionalPlan(auth.userId);
      if (!activePlanCheck.allowed) {
        return NextResponse.json(
          { error: activePlanCheck.message, code: "ACTIVE_PLAN_LIMIT" },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    const { dump, mode, time_available, energy_level, focus_area, copyFromPlanId, label } = body;

    const validTime = ["low", "medium", "high"];
    const validEnergy = ["drained", "ok", "fired_up"];
    const validFocus = ["work", "health", "home", "money", "other"];

    if (!validTime.includes(time_available) || !validEnergy.includes(energy_level) || !validFocus.includes(focus_area)) {
      return NextResponse.json(
        { error: "Please select all planning options before submitting." },
        { status: 400 }
      );
    }

    const constraints = {
      time_available,
      energy_level,
      focus_area,
    };
    const planMode = mode || "week";

    // Recurring weeks: copy from previous plan
    if (copyFromPlanId) {
      const tier = await getUserTier(auth.userId);
      if (!canUseRecurring(tier)) {
        return NextResponse.json(
          { error: "Recurring weeks are available on Pro and Pro Plus.", code: "TIER_REQUIRED" },
          { status: 403 }
        );
      }

      // Also check active plan limit for copy path
      const activePlanCheckCopy = await canCreateAdditionalPlan(auth.userId);
      if (!activePlanCheckCopy.allowed) {
        return NextResponse.json(
          { error: activePlanCheckCopy.message, code: "ACTIVE_PLAN_LIMIT" },
          { status: 403 }
        );
      }

      const sourcePlan = await getPlan(copyFromPlanId, auth.userId);

      if (!sourcePlan) {
        return NextResponse.json({ error: "Source plan not found" }, { status: 404 });
      }

      // Copy tasks — shifts to next week on Saturday
      const { weekStart, weekEnd } = getTargetWeek();

      // Enforce 7-item active cap: move excess this_week tasks to not_this_week
      const doFirstTasks = sourcePlan.tasks.filter(t => t.section === "do_first");
      const thisWeekTasks = sourcePlan.tasks.filter(t => t.section === "this_week");
      const notThisWeekTasks = sourcePlan.tasks.filter(t => t.section === "not_this_week");
      const maxActive = 7;
      const activeSlots = Math.max(0, maxActive - doFirstTasks.length);
      const cappedThisWeek = thisWeekTasks.slice(0, activeSlots);
      const overflowToParked = thisWeekTasks.slice(activeSlots);

      const cappedTasks = [
        ...doFirstTasks.slice(0, maxActive),
        ...cappedThisWeek,
        ...overflowToParked.map(t => ({ ...t, section: "not_this_week" as const })),
        ...notThisWeekTasks,
      ];

      const planId = await createPlanWithTasks({
        userId: auth.userId,
        mode: planMode,
        label: label || null,
        weekStart,
        weekEnd,
        originalDump: `[Copied from plan ${copyFromPlanId}]`,
        parsedDump: sourcePlan.parsedDump || {},
        planMeta: sourcePlan.planMeta || {},
        constraints,
        status: "review",
        tasks: cappedTasks.map((task, i) => ({
          title: task.title,
          section: task.section,
          timeEstimate: task.timeEstimate || null,
          effort: task.effort,
          urgency: task.urgency || "medium",
          category: task.category,
          context: task.context || null,
          status: "pending",
          sortOrder: i,
        })),
      });

      return NextResponse.json({
        id: planId,
        plansRemaining: planCheck.remaining === Infinity ? null : planCheck.remaining - 1,
        plansLimit: planCheck.limit === Infinity ? null : planCheck.limit,
      });
    }

    // New plan: validate brain dump
    if (!dump || dump.length < 20) {
      return NextResponse.json(
        { error: "Please write a bit more so we can build a good plan" },
        { status: 400 }
      );
    }

    if (dump.length > 10000) {
      return NextResponse.json(
        { error: "Brain dump is too long. Please keep it under 10,000 characters." },
        { status: 400 }
      );
    }

    // Check if user has learning enabled and fetch learnings
    // Skip for anonymous users (no history to learn from)
    let userLearnings = null;
    if (!auth.isAnon) {
      try {
        const userRecord = await getUser(auth.userId);
        if (userRecord?.learnEnabled !== false) {
          userLearnings = await generateLearningSummary(auth.userId);
        }
      } catch (learningsErr) {
        console.error("Learnings fetch failed (non-fatal):", learningsErr);
        // Degrade gracefully — plan generation continues without learnings
      }
    }

    // Run the three-call pipeline: Parse → Score → Generate
    const { parsed, scored, plan } = await generateFullPlan(dump, constraints, planMode, userLearnings);

    if (!parsed.tasks || parsed.tasks.length === 0) {
      return NextResponse.json(
        {
          error:
            "We couldn't find any tasks in your brain dump. Try breaking it into shorter sentences.",
        },
        { status: 400 }
      );
    }

    // Anonymous users can generate but must log in to save
    // Return early before any Firestore save operations
    if (auth.isAnon) {
      // Build the same plan structure as saved plans so the preview page can display it
      const anonPlanMeta: PlanMeta = {
        headline: plan.headline,
        burnout_alert: plan.burnout_alert,
        reality_check: plan.reality_check,
        real_talk: plan.real_talk,
        next_week_preview: plan.next_week_preview,
      };

      const { weekStart: anonWeekStart, weekEnd: anonWeekEnd } = getTargetWeek();

      const anonTasks = [
        ...(plan.do_first || []).map((task: { title: string; time_estimate?: string; why?: string; context?: string }, i: number) => ({
          id: `preview-${i}`,
          title: task.title,
          section: "do_first",
          timeEstimate: task.time_estimate || null,
          effort: findParsedEffort(parsed.tasks, task.title),
          urgency: findParsedUrgency(parsed.tasks, task.title),
          category: findParsedCategory(parsed.tasks, task.title),
          context: [task.why, task.context].filter(Boolean).join(" | ") || null,
          status: "pending",
          sortOrder: i,
        })),
        ...(plan.this_week || []).map((task: { title: string; time_estimate?: string; category?: string; notes?: string }, i: number) => ({
          id: `preview-${(plan.do_first?.length || 0) + i}`,
          title: task.title,
          section: "this_week",
          timeEstimate: task.time_estimate || null,
          effort: findParsedEffort(parsed.tasks, task.title),
          urgency: findParsedUrgency(parsed.tasks, task.title),
          category: task.category || "other",
          context: task.notes || null,
          status: "pending",
          sortOrder: (plan.do_first?.length || 0) + i,
        })),
        ...(plan.not_this_week || []).map((task: { title: string; reason?: string; validation?: string }, i: number) => ({
          id: `preview-${100 + i}`,
          title: task.title,
          section: "not_this_week",
          timeEstimate: null,
          effort: findParsedEffort(parsed.tasks, task.title),
          urgency: findParsedUrgency(parsed.tasks, task.title),
          category: findParsedCategory(parsed.tasks, task.title),
          context: [task.reason, task.validation].filter(Boolean).join(" | ") || null,
          status: "pending",
          sortOrder: 100 + i,
        })),
      ];

      return NextResponse.json({
        id: null,
        requiresLogin: true,
        preview: {
          mode: planMode,
          weekStart: anonWeekStart.toISOString(),
          weekEnd: anonWeekEnd.toISOString(),
          status: "review",
          planMeta: JSON.stringify(anonPlanMeta),
          tasks: anonTasks,
          originalDump: dump,
          constraints,
        },
      });
    }

    // Build plan metadata
    const planMeta: PlanMeta = {
      headline: plan.headline,
      burnout_alert: plan.burnout_alert,
      reality_check: plan.reality_check,
      real_talk: plan.real_talk,
      next_week_preview: plan.next_week_preview,
    };

    // Calculate week dates — shifts to next week on Saturday
    const { weekStart, weekEnd } = getTargetWeek();

    // Re-check plan limit right before saving (closes race window from LLM delay)
    const recheck = await canCreatePlan(auth.userId);
    if (!recheck.allowed) {
      return NextResponse.json(
        { error: recheck.message, code: "PLAN_LIMIT_REACHED" },
        { status: 403 }
      );
    }

    // Re-check active plan limit (another tab could have created a plan during LLM call)
    const activeRecheck = await canCreateAdditionalPlan(auth.userId);
    if (!activeRecheck.allowed) {
      return NextResponse.json(
        { error: activeRecheck.message, code: "ACTIVE_PLAN_LIMIT" },
        { status: 403 }
      );
    }

    // Build tasks array — native Firestore maps, no JSON.stringify needed
    const tasks = [
      // Do First tasks
      ...(plan.do_first || []).map((task, i) => ({
        title: task.title,
        section: "do_first",
        timeEstimate: task.time_estimate || null,
        effort: findParsedEffort(parsed.tasks, task.title),
        urgency: findParsedUrgency(parsed.tasks, task.title),
        category: findParsedCategory(parsed.tasks, task.title),
        context: [task.why, task.context].filter(Boolean).join(" | ") || null,
        status: "pending",
        sortOrder: i,
      })),
      // This Week tasks
      ...(plan.this_week || []).map((task, i) => ({
        title: task.title,
        section: "this_week",
        timeEstimate: task.time_estimate || null,
        effort: findParsedEffort(parsed.tasks, task.title),
        urgency: findParsedUrgency(parsed.tasks, task.title),
        category: task.category || "other",
        context: task.notes || null,
        status: "pending",
        sortOrder: (plan.do_first?.length || 0) + i,
      })),
      // Not This Week tasks
      ...(plan.not_this_week || []).map((task, i) => ({
        title: task.title,
        section: "not_this_week",
        timeEstimate: null,
        effort: findParsedEffort(parsed.tasks, task.title),
        urgency: findParsedUrgency(parsed.tasks, task.title),
        category: findParsedCategory(parsed.tasks, task.title),
        context: [task.reason, task.validation].filter(Boolean).join(" | ") || null,
        status: "pending",
        sortOrder: 100 + i,
      })),
    ];

    // Save plan to Firestore (batched write: plan doc + all task docs)
    const planId = await createPlanWithTasks({
      userId: auth.userId,
      mode: planMode,
      label: label || null,
      weekStart,
      weekEnd,
      originalDump: dump,
      parsedDump: parsed as unknown as Record<string, unknown>,
      planMeta: planMeta as unknown as Record<string, unknown>,
      constraints,
      status: "review",
      tasks,
    });

    return NextResponse.json({
      id: planId,
      plansRemaining: planCheck.remaining === Infinity ? null : planCheck.remaining - 1,
      plansLimit: planCheck.limit === Infinity ? null : planCheck.limit,
    });
  } finally {
    if (!auth.isAnon) generationLocks.delete(auth.userId);
  }

  } catch (e) {
    const err = e as Error & { status?: number; error?: { type?: string }; code?: string };
    console.error("Plan generation error:", {
      message: err.message,
      name: err.name,
      status: err.status,
      code: err.code,
      errorType: err.error?.type,
      stack: err.stack?.substring(0, 500),
    });

    const message = err.message || "";

    // Anthropic API key issues
    if (message.includes("ANTHROPIC_API_KEY") || err.status === 401) {
      return NextResponse.json(
        { error: "AI service configuration error. Please contact support." },
        { status: 500 }
      );
    }

    // Rate limit from Anthropic
    if (err.status === 429) {
      return NextResponse.json(
        { error: "Our AI service is busy. Please try again in a minute." },
        { status: 429 }
      );
    }

    // Timeout
    if (message.includes("timeout") || message.includes("ECONNREFUSED") || message.includes("ETIMEDOUT")) {
      return NextResponse.json(
        {
          error:
            "Plan generation took a bit longer than expected. Please try again.",
        },
        { status: 408 }
      );
    }

    // Anthropic overloaded
    if (err.status === 529 || message.includes("overloaded")) {
      return NextResponse.json(
        { error: "Our AI service is temporarily overloaded. Please try again in a moment." },
        { status: 503 }
      );
    }

    // Anthropic server error (500/502/503)
    if (err.status && err.status >= 500) {
      return NextResponse.json(
        { error: "Our AI service is temporarily unavailable. Please try again in a moment." },
        { status: 503 }
      );
    }

    // LLM returned invalid JSON
    if (message.includes("invalid JSON")) {
      return NextResponse.json(
        { error: "Plan generation hit a hiccup. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Something went wrong generating your plan. Please try again." },
      { status: 500 }
    );
  }
}

// ─── Helpers to match generated titles back to parsed task metadata ───

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findParsedTask(
  parsedTasks: { title: string; effort: string; urgency: string; category: string }[],
  generatedTitle: string
) {
  const norm = normalise(generatedTitle);
  return parsedTasks.find((t) => {
    const tNorm = normalise(t.title);
    return tNorm === norm || norm.includes(tNorm) || tNorm.includes(norm);
  });
}

function findParsedEffort(
  parsedTasks: { title: string; effort: string }[],
  generatedTitle: string
): string {
  return findParsedTask(parsedTasks as never[], generatedTitle)?.effort || "medium";
}

function findParsedUrgency(
  parsedTasks: { title: string; urgency: string }[],
  generatedTitle: string
): string {
  return findParsedTask(parsedTasks as never[], generatedTitle)?.urgency || "medium";
}

function findParsedCategory(
  parsedTasks: { title: string; category: string }[],
  generatedTitle: string
): string {
  return findParsedTask(parsedTasks as never[], generatedTitle)?.category || "other";
}
