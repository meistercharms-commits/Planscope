export interface User {
  id: string;
  email: string;
  provider?: string;
}

export interface Plan {
  id: string;
  userId: string;
  mode: string;
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

export interface ParsedDump {
  tasks: ParsedTask[];
  themes: string[];
}

export interface ParsedTask {
  title: string;
  effort: 'small' | 'medium' | 'large';
  urgency: 'low' | 'medium' | 'high';
  deadline: string | null;
  category: string;
}

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
