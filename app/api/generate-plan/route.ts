import { NextRequest, NextResponse } from "next/server";
import { getAuthOrAnon } from "@/lib/auth";
import { generateFullPlan } from "@/lib/llm";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { canCreatePlan, getUserTier, canUseRecurring } from "@/lib/tiers";
import { PlanMeta } from "@/types";
import { generateLearningSummary } from "@/lib/learnings";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    if (!rateLimit(`plan:${ip}`, { maxRequests: 10, windowMs: 60 * 60 * 1000 })) {
      return NextResponse.json(
        { error: "Too many plan requests. Please try again later." },
        { status: 429 }
      );
    }

    const auth = await getAuthOrAnon();

    // Check plan creation limit
    const planCheck = await canCreatePlan(auth.userId);
    if (!planCheck.allowed) {
      return NextResponse.json(
        { error: planCheck.message, code: "PLAN_LIMIT_REACHED" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { dump, mode, time_available, energy_level, focus_area, copyFromPlanId, label } = body;

    const constraints = {
      time_available: time_available || "medium",
      energy_level: energy_level || "ok",
      focus_area: focus_area || "work",
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

      const sourcePlan = await prisma.plan.findFirst({
        where: { id: copyFromPlanId, userId: auth.userId },
        include: { tasks: true },
      });

      if (!sourcePlan) {
        return NextResponse.json({ error: "Source plan not found" }, { status: 404 });
      }

      // Copy tasks directly from source plan
      const now = new Date();
      const dayOfWeek = now.getDay();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - dayOfWeek);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const savedPlan = await prisma.plan.create({
        data: {
          userId: auth.userId,
          mode: planMode,
          label: label || null,
          weekStart,
          weekEnd,
          originalDump: `[Copied from plan ${copyFromPlanId}]`,
          parsedDump: sourcePlan.parsedDump,
          planMeta: sourcePlan.planMeta,
          constraints: JSON.stringify(constraints),
          status: "review",
          tasks: {
            create: sourcePlan.tasks.map((task, i) => ({
              title: task.title,
              section: task.section,
              timeEstimate: task.timeEstimate,
              effort: task.effort,
              urgency: task.urgency,
              category: task.category,
              context: task.context,
              status: "pending",
              sortOrder: i,
            })),
          },
        },
        include: { tasks: { orderBy: { sortOrder: "asc" } } },
      });

      return NextResponse.json({
        id: savedPlan.id,
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
    const userRecord = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { learnEnabled: true },
    });
    const userLearnings =
      userRecord?.learnEnabled !== false
        ? await generateLearningSummary(auth.userId)
        : null;

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

    // Build plan metadata
    const planMeta: PlanMeta = {
      headline: plan.headline,
      burnout_alert: plan.burnout_alert,
      reality_check: plan.reality_check,
      real_talk: plan.real_talk,
      next_week_preview: plan.next_week_preview,
    };

    // Calculate week dates
    const now = new Date();
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    // Save plan to database
    const savedPlan = await prisma.plan.create({
      data: {
        userId: auth.userId,
        mode: planMode,
        label: label || null,
        weekStart,
        weekEnd,
        originalDump: dump,
        parsedDump: JSON.stringify(parsed),
        planMeta: JSON.stringify(planMeta),
        constraints: JSON.stringify(constraints),
        status: "review",
        tasks: {
          create: [
            // Do First tasks
            ...(plan.do_first || []).map((task, i) => ({
              title: task.title,
              section: "do_first",
              timeEstimate: task.time_estimate || null,
              effort: findParsedEffort(parsed.tasks, task.title),
              urgency: findParsedUrgency(parsed.tasks, task.title),
              category: findParsedCategory(parsed.tasks, task.title),
              context: [task.why, task.context].filter(Boolean).join(" | "),
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
              context: [task.reason, task.validation].filter(Boolean).join(" | "),
              status: "pending",
              sortOrder: 100 + i,
            })),
          ],
        },
      },
      include: { tasks: { orderBy: { sortOrder: "asc" } } },
    });

    return NextResponse.json({
      id: savedPlan.id,
      plansRemaining: planCheck.remaining === Infinity ? null : planCheck.remaining - 1,
      plansLimit: planCheck.limit === Infinity ? null : planCheck.limit,
    });
  } catch (e) {
    console.error("Plan generation error:", e);

    const message = (e as Error).message;
    if (message.includes("timeout") || message.includes("ECONNREFUSED")) {
      return NextResponse.json(
        {
          error:
            "Plan generation took a bit longer than expected. Please try again.",
        },
        { status: 408 }
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
