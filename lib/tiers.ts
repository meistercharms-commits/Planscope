import { prisma } from '@/lib/db';
import { Tier, TIER_LIMITS } from '@/types';

const MAX_ACTIVE_TASKS = 7;

/**
 * Get the user's current tier from the database.
 * Anonymous users are always 'free'.
 */
export async function getUserTier(userId: string): Promise<Tier> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tier: true, email: true },
  });
  if (!user) return 'free';
  if (user.email.endsWith('@planscope.local')) return 'free';
  return (user.tier as Tier) || 'free';
}

/**
 * Count how many plans a user has created in the current calendar month.
 */
export async function getMonthlyPlanCount(userId: string): Promise<number> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return prisma.plan.count({
    where: {
      userId,
      createdAt: { gte: monthStart, lt: monthEnd },
    },
  });
}

/**
 * Check whether the user can create a new plan.
 */
export async function canCreatePlan(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
  message?: string;
}> {
  const tier = await getUserTier(userId);
  const limits = TIER_LIMITS[tier];
  const count = await getMonthlyPlanCount(userId);

  if (limits.plansPerMonth === Infinity) {
    return { allowed: true, remaining: Infinity, limit: Infinity };
  }

  const remaining = Math.max(0, limits.plansPerMonth - count);

  if (remaining <= 0) {
    return {
      allowed: false,
      remaining: 0,
      limit: limits.plansPerMonth,
      message: `You've used all ${limits.plansPerMonth} plans this month. Your plans reset on the 1st.`,
    };
  }

  return { allowed: true, remaining, limit: limits.plansPerMonth };
}

/**
 * Check whether adding a task to the active sections would exceed the 7-item cap.
 */
export async function canAddActiveTask(planId: string): Promise<{
  allowed: boolean;
  activeCount: number;
  message?: string;
}> {
  const activeCount = await prisma.planTask.count({
    where: {
      planId,
      section: { in: ['do_first', 'this_week'] },
    },
  });

  if (activeCount >= MAX_ACTIVE_TASKS) {
    return {
      allowed: false,
      activeCount,
      message: 'Your plan is full. Pick what matters.',
    };
  }

  return { allowed: true, activeCount };
}

/**
 * Count how many active or review plans the user has for the current week.
 */
export async function getActiveWeekPlanCount(userId: string): Promise<number> {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);

  return prisma.plan.count({
    where: {
      userId,
      status: { in: ['active', 'review'] },
      weekStart: { gte: weekStart },
    },
  });
}

/**
 * Check whether the user can create an additional active plan this week.
 * Free/Pro users are limited to 1 active plan per week.
 */
export async function canCreateAdditionalPlan(userId: string): Promise<{
  allowed: boolean;
  activeCount: number;
  message?: string;
}> {
  const tier = await getUserTier(userId);
  const activeCount = await getActiveWeekPlanCount(userId);

  if (canHaveMultipleActivePlans(tier)) {
    return { allowed: true, activeCount };
  }

  if (activeCount >= 1) {
    return {
      allowed: false,
      activeCount,
      message: 'You already have an active plan this week. Finish your tasks or archive it to start a new one.',
    };
  }

  return { allowed: true, activeCount };
}

export function canHaveMultipleActivePlans(tier: Tier): boolean {
  return TIER_LIMITS[tier].multipleActivePlans;
}

export function canViewHistory(tier: Tier): boolean {
  return TIER_LIMITS[tier].history;
}

export function canUseRecurring(tier: Tier): boolean {
  return TIER_LIMITS[tier].recurring;
}
