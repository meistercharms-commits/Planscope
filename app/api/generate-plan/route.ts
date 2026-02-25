import { NextRequest, NextResponse } from "next/server";
import { getAuthOrAnon } from "@/lib/auth";
import { parseBrainDump, generatePlanText } from "@/lib/llm";
import { selectPlan } from "@/lib/scoring";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

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

    const { dump, mode, time_available, energy_level, focus_area } =
      await req.json();

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

    // Step 1: Parse brain dump via LLM
    const parsed = await parseBrainDump(dump);

    if (!parsed.tasks || parsed.tasks.length === 0) {
      return NextResponse.json(
        {
          error:
            "We couldn't find any tasks in your brain dump. Try breaking it into shorter sentences.",
        },
        { status: 400 }
      );
    }

    // Step 2: Score & select tasks (rule-based, no LLM)
    const plan = selectPlan(
      parsed.tasks,
      {
        time_available: time_available || "medium",
        energy_level: energy_level || "ok",
        focus_area: focus_area || "work",
      },
      mode || "week"
    );

    // Step 3: Generate friendly text via LLM
    const friendlyTexts = await generatePlanText(
      plan.thisWeek.map((t) => ({
        title: t.title,
        effort: t.effort,
        urgency: t.urgency,
        category: t.category,
      }))
    );

    // Calculate week dates
    const now = new Date();
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    // Step 4: Save plan to database
    const savedPlan = await prisma.plan.create({
      data: {
        userId: auth.userId,
        mode: mode || "week",
        weekStart,
        weekEnd,
        originalDump: dump,
        parsedDump: JSON.stringify(parsed),
        constraints: JSON.stringify({
          time_available,
          energy_level,
          focus_area,
        }),
        status: "review",
        tasks: {
          create: [
            ...plan.doFirst.map((task, i) => ({
              title: friendlyTexts[i]?.title || task.title,
              section: "do_first",
              timeEstimate:
                friendlyTexts[i]?.timeEstimate || estimateTime(task.effort),
              effort: task.effort,
              urgency: task.urgency,
              category: task.category,
              context: friendlyTexts[i]?.context || null,
              status: "pending",
              sortOrder: i,
            })),
            ...plan.thisWeek
              .filter((_, i) => i >= plan.doFirst.length)
              .map((task, i) => {
                const textIdx = plan.doFirst.length + i;
                return {
                  title: friendlyTexts[textIdx]?.title || task.title,
                  section: "this_week",
                  timeEstimate:
                    friendlyTexts[textIdx]?.timeEstimate ||
                    estimateTime(task.effort),
                  effort: task.effort,
                  urgency: task.urgency,
                  category: task.category,
                  context: friendlyTexts[textIdx]?.context || null,
                  status: "pending",
                  sortOrder: textIdx,
                };
              }),
            ...plan.notThisWeek.map((task, i) => ({
              title: task.title,
              section: "not_this_week",
              timeEstimate: estimateTime(task.effort),
              effort: task.effort,
              urgency: task.urgency,
              category: task.category,
              context: null,
              status: "pending",
              sortOrder: 100 + i,
            })),
          ],
        },
      },
      include: { tasks: { orderBy: { sortOrder: "asc" } } },
    });

    return NextResponse.json({ id: savedPlan.id });
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

function estimateTime(effort: string): string {
  switch (effort) {
    case "small":
      return "15-30 min";
    case "medium":
      return "45 min - 1.5 hrs";
    case "large":
      return "2-3 hrs";
    default:
      return "30-60 min";
  }
}
