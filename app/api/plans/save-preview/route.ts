import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { getAuthOrAnon } from "@/lib/auth";
import { createPlanWithTasks } from "@/lib/firestore";
import { canCreatePlan, canCreateAdditionalPlan } from "@/lib/tiers";

/**
 * POST /api/plans/save-preview
 * Saves an anonymous preview plan to Firestore after the user signs up / logs in.
 *
 * Supports two auth methods:
 * 1. Authorization: Bearer <idToken> — used during login flow (avoids session cookie timing)
 * 2. Session cookie — standard fallback
 */
export async function POST(req: NextRequest) {
  try {
    // Resolve user ID — prefer direct token auth to avoid session cookie race conditions
    let userId: string;

    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const idToken = authHeader.slice(7);
      const decoded = await adminAuth.verifyIdToken(idToken, true);

      // Reject anonymous users
      const userRecord = await adminAuth.getUser(decoded.uid);
      if (userRecord.providerData.length === 0 && !userRecord.email) {
        return NextResponse.json(
          { error: "Login required to save plans" },
          { status: 401 }
        );
      }

      userId = decoded.uid;
    } else {
      // Fallback to session cookie
      const auth = await getAuthOrAnon();
      if (auth.isAnon) {
        return NextResponse.json(
          { error: "Login required to save plans" },
          { status: 401 }
        );
      }
      userId = auth.userId;
    }

    // Enforce tier limits (same as generate-plan)
    const planCheck = await canCreatePlan(userId);
    if (!planCheck.allowed) {
      return NextResponse.json(
        { error: planCheck.message || "Plan limit reached", code: "PLAN_LIMIT_REACHED" },
        { status: 403 }
      );
    }

    const activePlanCheck = await canCreateAdditionalPlan(userId);
    if (!activePlanCheck.allowed) {
      return NextResponse.json(
        { error: activePlanCheck.message, code: "ACTIVE_PLAN_LIMIT" },
        { status: 403 }
      );
    }

    const { preview } = await req.json();

    if (!preview || !Array.isArray(preview.tasks) || preview.tasks.length === 0) {
      return NextResponse.json(
        { error: "Invalid preview data" },
        { status: 400 }
      );
    }

    if (preview.tasks.length > 50) {
      return NextResponse.json(
        { error: "Too many tasks" },
        { status: 400 }
      );
    }

    // Validate mode
    const validModes = ["week", "today"];
    const mode = validModes.includes(preview.mode) ? preview.mode : "week";

    // Validate dates
    const weekStart = new Date(preview.weekStart);
    const weekEnd = new Date(preview.weekEnd);
    if (isNaN(weekStart.getTime()) || isNaN(weekEnd.getTime())) {
      return NextResponse.json(
        { error: "Invalid date range" },
        { status: 400 }
      );
    }

    // Validate and sanitise tasks
    const validSections = ["do_first", "this_week", "not_this_week"];
    const tasks = [];
    for (let i = 0; i < preview.tasks.length; i++) {
      const t = preview.tasks[i];
      if (!t.title || typeof t.title !== "string" || t.title.trim().length === 0) {
        return NextResponse.json({ error: "Task title is required" }, { status: 400 });
      }
      if (t.title.length > 500) {
        return NextResponse.json({ error: "Task title must be under 500 characters" }, { status: 400 });
      }
      if (!validSections.includes(t.section)) {
        return NextResponse.json({ error: "Invalid task section" }, { status: 400 });
      }
      tasks.push({
        title: t.title,
        section: t.section,
        timeEstimate: typeof t.timeEstimate === "string" ? t.timeEstimate.slice(0, 100) : null,
        effort: typeof t.effort === "string" ? t.effort : null,
        urgency: typeof t.urgency === "string" ? t.urgency : null,
        category: typeof t.category === "string" ? t.category : null,
        context: typeof t.context === "string" ? t.context.slice(0, 1000) : null,
        status: "pending" as const,
        sortOrder: typeof t.sortOrder === "number" ? t.sortOrder : i,
      });
    }

    // Parse planMeta if it's a JSON string (the preview stores it stringified)
    let planMeta = preview.planMeta || null;
    if (typeof planMeta === "string") {
      try {
        planMeta = JSON.parse(planMeta);
      } catch {
        planMeta = null;
      }
    }

    // Limit originalDump length
    const originalDump = typeof preview.originalDump === "string"
      ? preview.originalDump.slice(0, 10000)
      : "";

    const planId = await createPlanWithTasks({
      userId,
      mode,
      label: null,
      weekStart,
      weekEnd,
      originalDump,
      parsedDump: null,
      planMeta,
      constraints: preview.constraints || null,
      status: "review",
      tasks,
    });

    return NextResponse.json({ id: planId });
  } catch (e) {
    console.error("Save preview error:", e);
    return NextResponse.json(
      { error: "Failed to save plan" },
      { status: 500 }
    );
  }
}
