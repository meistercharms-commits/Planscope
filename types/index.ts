export type Tier = 'free' | 'pro' | 'pro_plus';

export const TIER_LIMITS = {
  free: { plansPerMonth: 4, multipleActivePlans: false, history: false, recurring: false },
  pro: { plansPerMonth: 8, multipleActivePlans: false, history: true, recurring: true },
  pro_plus: { plansPerMonth: Infinity, multipleActivePlans: true, history: true, recurring: true },
} as const;

export const TIER_LABELS: Record<Tier, string> = {
  free: 'Free',
  pro: 'Pro',
  pro_plus: 'Pro Plus',
};

export const TIER_PRICES: Record<Tier, { monthly: string; yearly?: string }> = {
  free: { monthly: '£0' },
  pro: { monthly: '£7.99' },
  pro_plus: { monthly: '£14.99', yearly: '£149.99/year' },
};

export interface User {
  id: string;
  email: string;
  provider?: string;
  tier: Tier;
}

export interface Plan {
  id: string;
  userId: string;
  mode: string;
  label: string | null;
  weekStart: string;
  weekEnd: string;
  originalDump: string;
  parsedDump: ParsedDump | null;
  constraints: UserConstraints | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  tasks: PlanTask[];
}

export interface PlanTask {
  id: string;
  planId: string;
  title: string;
  section: 'do_first' | 'this_week' | 'not_this_week';
  timeEstimate: string | null;
  effort: string | null;
  urgency: string | null;
  category: string | null;
  context: string | null;
  status: 'pending' | 'done' | 'skipped';
  sortOrder: number;
  completedAt: string | null;
  createdAt: string;
}

// ─── Parse (Call 1) ───

export interface ParsedDump {
  tasks: ParsedTask[];
  emotional_context: EmotionalContext;
  themes: string[];
  recommendation: string;
}

export interface ParsedTask {
  id: string;
  title: string;
  effort: 'small' | 'medium' | 'large';
  urgency: 'low' | 'medium' | 'high';
  deadline: string | null;
  category: string;
  blocks_other_work: boolean;
  anxiety_reduction: boolean;
  is_quick_win: boolean;
  notes: string | null;
}

export interface EmotionalContext {
  detected_anxiety_signals: string[];
  detected_burnout_signals: string[];
  detected_values: string[];
  context_switching_burden: number;
  health_neglect_signals: string[];
  overall_overwhelm_level: number;
}

// ─── Score (Call 2) ───

export interface ScoredTaskData {
  task_id: string;
  title: string;
  base_score: number;
  urgency_score: number;
  realism_score: number;
  anxiety_reduction_score: number;
  quick_win_score: number;
  final_score: number;
  veto_reason: string | null;
  confidence_this_is_doable: number;
}

export interface CapacityAnalysis {
  hours_available: number;
  hours_already_committed: number;
  hours_for_discretionary: number;
  recommended_task_count: number;
  user_is_overloaded: boolean;
  burnout_risk: 'low' | 'medium' | 'high' | 'critical';
}

export interface VetoEntry {
  task_id: string;
  title: string;
  reason: string;
}

export interface QuickWinEntry {
  task_id: string;
  title: string;
  why: string;
}

export interface ScoredTasksResult {
  scored_tasks: ScoredTaskData[];
  capacity_analysis: CapacityAnalysis;
  veto_filter_applied: VetoEntry[];
  quick_wins_identified: QuickWinEntry[];
  recommendation: string;
}

// ─── Generate Text (Call 3) ───

export interface DoFirstItem {
  title: string;
  time_estimate: string;
  why: string;
  context: string;
}

export interface ThisWeekItem {
  title: string;
  time_estimate: string;
  category: string;
  notes: string;
}

export interface NotThisWeekItem {
  title: string;
  reason: string;
  validation: string;
}

export interface GeneratedPlanOutput {
  headline: string;
  burnout_alert: string | null;
  do_first: DoFirstItem[];
  this_week: ThisWeekItem[];
  not_this_week: NotThisWeekItem[];
  reality_check: string;
  real_talk: string | null;
  next_week_preview: string;
}

// ─── Stored plan metadata ───

export interface PlanMeta {
  headline: string;
  burnout_alert: string | null;
  reality_check: string;
  real_talk: string | null;
  next_week_preview: string;
}

// ─── Constraints + legacy scoring ───

export interface UserConstraints {
  time_available: 'low' | 'medium' | 'high';
  energy_level: 'drained' | 'ok' | 'fired_up';
  focus_area: string;
}

export interface ScoredTask extends ParsedTask {
  score: number;
  idx: number;
  timeEstimate?: string;
  context?: string;
}

export interface GeneratedPlan {
  doFirst: ScoredTask[];
  thisWeek: ScoredTask[];
  notThisWeek: ScoredTask[];
}

// ─── Learnings (week-to-week learning loop) ───

export interface LearningsSummary {
  weeksSampled: number;
  overallCompletionRate: number;
  strongCategories: string[];
  weakCategories: string[];
  doFirstSuccess: number;
  recurringIssues: { title: string; count: number }[];
  overcommitmentWarning: boolean;
  topRecommendation: string;
}

export interface PlanLearning {
  planId: string;
  weekStart: string;
  metrics: {
    totalTasksPlanned: number;
    tasksCompleted: number;
    completionRate: number;
  };
  categoryPerformance: Record<string, { attempted: number; completed: number; rate: number }>;
  doFirstCompletion: number;
  quickWinCompletion: number;
}
