import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function DashboardPage() {
  const auth = await getCurrentUser();
  // Anonymous users go straight to brain dump
  if (!auth) redirect("/new-plan");

  // Check for active plan this week
  const now = new Date();
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);

  const activePlan = await prisma.plan.findFirst({
    where: {
      userId: auth.userId,
      status: { in: ["active", "review"] },
      weekStart: { gte: weekStart },
    },
    orderBy: { createdAt: "desc" },
  });

  if (activePlan) {
    if (activePlan.status === "review") {
      redirect(`/plan/${activePlan.id}`);
    }
    redirect(`/plan/${activePlan.id}/progress`);
  }

  // No active plan - go to brain dump
  redirect("/new-plan");
}
