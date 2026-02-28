import Anthropic from "@anthropic-ai/sdk";
import {
  ParsedDump,
  UserConstraints,
  ScoredTasksResult,
  GeneratedPlanOutput,
  LearningsSummary,
} from "@/types";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}
const MODEL = "claude-sonnet-4-20250514";

// ─── Prompt Constants ───

const ANALYSE_SYSTEM_PROMPT = `You are a compassionate planning assistant and strategic adviser. Your job is to:

1. Parse an overwhelming brain dump into clear, actionable tasks
2. Understand emotional context (anxiety, burnout, values)
3. Score each task realistically on urgency, realism, anxiety reduction, and quick-win potential
4. Apply a VETO filter for unrealistic tasks
5. Assess capacity and burnout risk
6. Identify quick wins for confidence building

A good plan that gets done is better than a perfect plan that gets abandoned. Realistic > ambitious.

Return ONLY valid JSON. No preamble, no explanation, no markdown.`;

const GENERATE_SYSTEM_PROMPT = `You are a compassionate plan generator. Your job is to turn a scored task list into a plan that feels personalised, achievable, and psychologically safe.

You will:
1. Write clear, concise task descriptions
2. Explain the "why" behind prioritisation
3. Validate parked items (make them feel OK)
4. Flag burnout if detected
5. Provide honest reality checks
6. Use kind, non-shaming language

Important: The user is reading this plan when they're overwhelmed. Every word should say: "I understand you. This is real. You can do this."`;

// ─── Helper ───

function extractJSON(text: string): string {
  let str = text.trim();
  const jsonMatch = str.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    str = jsonMatch[1].trim();
  }
  return str;
}

function timeLabel(level: string, mode: string): string {
  if (mode === "today") {
    return { low: "2-3 hours", medium: "4-6 hours", high: "8+ hours" }[level] || "4-6 hours";
  }
  return { low: "5-10 hours", medium: "10-20 hours", high: "20+ hours" }[level] || "10-20 hours";
}

// ─── Learnings Context Builder ───

function buildLearningsContext(learnings: LearningsSummary): string {
  const lines: string[] = [
    `\nHISTORICAL LEARNING CONTEXT (from ${learnings.weeksSampled} previous plans):`,
    `- Overall completion rate: ${learnings.overallCompletionRate}%`,
  ];

  if (learnings.strongCategories.length > 0) {
    lines.push(`- Strong categories (>70% completion): ${learnings.strongCategories.join(", ")}`);
  }
  if (learnings.weakCategories.length > 0) {
    lines.push(`- Weak categories (<40% completion): ${learnings.weakCategories.join(", ")}`);
  }
  lines.push(`- Do-first success rate: ${learnings.doFirstSuccess}%`);

  if (learnings.overcommitmentWarning) {
    lines.push("- WARNING: User consistently overcommits. Reduce active task count.");
  }
  if (learnings.recurringIssues.length > 0) {
    for (const issue of learnings.recurringIssues) {
      lines.push(`- Recurring: "${issue.title}" appeared ${issue.count}x with low completion. Likely blocker.`);
    }
  }

  lines.push("");
  lines.push("ADJUSTMENT RULES:");
  lines.push("- Boost urgency for strong category tasks (high success likelihood)");
  lines.push("- Add realism penalty for large-effort tasks if user historically struggles");
  lines.push("- Boost quick-win score for tasks in weak categories (build momentum)");
  lines.push("- Flag recurring items for extra scrutiny");

  return lines.join("\n");
}

// ─── Call 1: Parse + Score (combined) ───

interface AnalyseResult {
  parsed: ParsedDump;
  scored: ScoredTasksResult;
}

async function analyseAndScore(
  dump: string,
  constraints: UserConstraints,
  mode: string,
  userLearnings?: LearningsSummary | null
): Promise<AnalyseResult> {
  const currentDate = new Date().toISOString().split("T")[0];
  const maxTasks = mode === "today" ? 3 : 7;
  const timeHours = timeLabel(constraints.time_available, mode);
  const periodLabel = mode === "today" ? "day" : "week";

  const message = await getClient().messages.create({
    model: MODEL,
    max_tokens: 3000,
    system: ANALYSE_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Parse this brain dump into structured tasks, then score and rank them.

BRAIN DUMP:
${dump}

USER CONSTRAINTS:
- Time available: ${timeHours} this ${periodLabel}
- Energy level: ${constraints.energy_level} (drained, ok, fired_up)
- Focus area: ${constraints.focus_area} (work, health, home, money, life)

CURRENT DATE: ${currentDate}
HARD LIMIT: Maximum ${maxTasks} active tasks. This is a product rule. Any beyond ${maxTasks} must be parked.

Return JSON with this exact structure:
{
  "parsed": {
    "tasks": [
      {
        "id": "task_1",
        "title": "Clear title of what to do",
        "effort": "small|medium|large",
        "urgency": "low|medium|high",
        "deadline": "YYYY-MM-DD or null",
        "category": "work|health|home|money|life",
        "blocks_other_work": true|false,
        "anxiety_reduction": true|false,
        "is_quick_win": true|false,
        "notes": "Context or reasoning"
      }
    ],
    "emotional_context": {
      "detected_anxiety_signals": [],
      "detected_burnout_signals": [],
      "detected_values": [],
      "context_switching_burden": 1-5,
      "health_neglect_signals": [],
      "overall_overwhelm_level": 1-10
    },
    "themes": ["theme1", "theme2"],
    "recommendation": "Brief assessment"
  },
  "scored": {
    "scored_tasks": [
      {
        "task_id": "task_1",
        "title": "Task title",
        "base_score": 0-100,
        "urgency_score": 0-100,
        "realism_score": 0-100,
        "anxiety_reduction_score": 0-100,
        "quick_win_score": 0-100,
        "final_score": 0-100,
        "veto_reason": null or "reason",
        "confidence_this_is_doable": 0-100
      }
    ],
    "capacity_analysis": {
      "hours_available": 20,
      "hours_already_committed": 12,
      "hours_for_discretionary": 8,
      "recommended_task_count": 5,
      "user_is_overloaded": true|false,
      "burnout_risk": "low|medium|high|critical"
    },
    "veto_filter_applied": [],
    "quick_wins_identified": [],
    "recommendation": "Selection strategy"
  }
}

PARSE GUIDELINES:
- Use British English spelling (organise, prioritise, colour, centre)
- effort: small = <30min, medium = 30min-2hrs, large = 2hrs+
- urgency: high = deadline within 3 days or "asap"/"urgent", medium = this week, low = no deadline
- deadline: only if explicitly mentioned. Infer dates from context.
- category: infer from context (exercise/gym = health, groceries/cleaning = home)
- Extract every actionable item, even small ones
- If user mentioned "drowning", "burnout", "anxiety" → flag in emotional_context
- Quick wins: Small effort, big emotional payoff
- Anxiety reduction: Completing removes mental burden
- If health mentioned negatively → flag health_neglect_signals
- Context switching: 3+ projects/clients → flag it
- If the brain dump contains only 1-2 actionable items, set overall_overwhelm_level to 1-2 (not higher). Do not inflate emotional signals for simple dumps.
- CONFLICT DETECTION: Check all parsed tasks for conflicts — mutually exclusive tasks (e.g. "finish project" vs "take a week off"), temporal impossibilities (two full-day tasks on the same day), or contradictory goals (e.g. "save money" vs "book holiday"). If found, set the notes field on BOTH conflicting tasks to "CONFLICT: [brief description]".

SCORING GUIDELINES:
Urgency: Real deadline 24hrs=95-100, 1wk=70-85, 2wks=40-60, none=10-30
Realism: effort << time+energy=90-100, ≈=60-75, >=20-40, >>=0-20
Anxiety Reduction: removes burden=80-100, somewhat=50-75, neutral=25-50
Quick Win: small+high payoff=80-100, small+medium=60-75, medium+=0-40

VETO FILTER:
- energy "drained" + effort "large" → VETO
- burnout state + non-essential → VETO
- prevents sleep/health → VETO
- overwhelm >= 8 + adds more work → VETO

FINAL SCORE: Urgency 35% + Realism 25% + Anxiety 20% + Quick win 20% (veto overrides all)${userLearnings ? buildLearningsContext(userLearnings) : ""}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from analyse");
  }

  let result: AnalyseResult;
  try {
    result = JSON.parse(extractJSON(content.text));
  } catch {
    console.error("[LLM Analyse] Failed to parse JSON. Raw text:", content.text.substring(0, 500));
    throw new Error("LLM analysis failed: invalid JSON response");
  }

  // Ensure emotional_context has sensible defaults
  if (!result.parsed.emotional_context) {
    result.parsed.emotional_context = {
      detected_anxiety_signals: [],
      detected_burnout_signals: [],
      detected_values: [],
      context_switching_burden: 1,
      health_neglect_signals: [],
      overall_overwhelm_level: 3,
    };
  }

  return result;
}

// ─── Call 2: Generate Plan Text ───

export async function generatePlanText(
  originalDump: string,
  parsedData: ParsedDump,
  scoredData: ScoredTasksResult,
  constraints: UserConstraints,
  mode: string,
  userLearnings?: LearningsSummary | null
): Promise<GeneratedPlanOutput> {
  const maxTasks = mode === "today" ? 3 : 7;
  const periodLabel = mode === "today" ? "today" : "this week";

  const message = await getClient().messages.create({
    model: MODEL,
    max_tokens: 2500,
    system: GENERATE_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Generate a personalised plan based on this data:

ORIGINAL BRAIN DUMP:
${originalDump}

PARSED & SCORED TASKS:
${JSON.stringify(scoredData.scored_tasks)}

ALL PARSED TASKS (for context):
${JSON.stringify(parsedData.tasks)}

USER CONTEXT:
- Time available: ${constraints.time_available}
- Energy level: ${constraints.energy_level}
- Overwhelm level: ${parsedData.emotional_context.overall_overwhelm_level}/10
- Burnout signals: ${JSON.stringify(parsedData.emotional_context.detected_burnout_signals)}
- Health neglect signals: ${JSON.stringify(parsedData.emotional_context.health_neglect_signals)}
- Quick wins identified: ${JSON.stringify(scoredData.quick_wins_identified)}
- Capacity analysis: ${JSON.stringify(scoredData.capacity_analysis)}
- Vetoed tasks: ${JSON.stringify(scoredData.veto_filter_applied)}

HARD LIMITS:
- Maximum ${maxTasks} tasks across do_first + this_week combined. This is absolute.
- do_first: ${mode === "today" ? "1" : "2-3"} highest-priority tasks
- this_week: remaining tasks up to the ${maxTasks}-task cap
- not_this_week: everything else (parked, vetoed, overflow)

Return JSON with this exact structure:
{
  "headline": "One-line emotional validation",
  "burnout_alert": "Alert if burnout detected, else null",
  "do_first": [
    {
      "title": "Task title",
      "time_estimate": "X-Y hours",
      "why": "Why this is first",
      "context": "Deadline or other context"
    }
  ],
  "this_week": [
    {
      "title": "Task title",
      "time_estimate": "X min",
      "category": "work|health|home|money|life",
      "notes": "Why it matters or how to approach"
    }
  ],
  "not_this_week": [
    {
      "title": "Task title",
      "reason": "Why it's not ${periodLabel}",
      "validation": "This matters, but here's why not now"
    }
  ],
  "reality_check": "Honest assessment of capacity + recommendations",
  "real_talk": "If burnout detected: direct advice on root cause. Else null.",
  "next_week_preview": "What to expect or prepare for"
}

TONE GUIDELINES:
- Use British English spelling (organise, prioritise, colour, centre)
- Kind, never shaming
- Explanatory ("You mentioned X, so we prioritised Y")
- Realistic ("You have 8 hours, not 20")
- Validating ("Your anxiety about invoicing is real")

LANGUAGE RULES:
- No productivity jargon ("optimize", "synergize", "maximize")
- No shame language ("you failed", "you're behind", "you should")
- No pressure ("you can crush this", "go big")
- Use: "you", "we", "real", "doable", "matters", "understand"

SPECIAL CASES:
- burnout_level >= 8: Recommend help, don't enable overwork.
- health_neglect signals: Include one health task explicitly.
- context_switching >= 4: Group tasks by context.
- overwhelm >= 8: Reduce count, explain capacity.
- 1-2 parsed tasks: This is a simple dump, not overwhelm. Use a direct, lightweight headline (e.g. "One thing. Let's get it done."). Put all tasks in do_first — leave this_week as []. Keep reality_check to one short sentence. Set next_week_preview to "". Do NOT pad with filler or "overwhelmed" framing.
- Tasks with "CONFLICT:" in notes: Pick the more urgent/realistic task for do_first, park the other in not_this_week with honest validation (e.g. "Both matter, but you can't do both this week"). Address the trade-off in reality_check. Never place two conflicting tasks in the same active section.

VALIDATION RULES FOR "NOT THIS WEEK":
Every parked item: "This matters. I'm not dismissing it. Here's why not now."
Never: "This isn't important." Instead: "This is real. It's just not ${periodLabel}."${userLearnings ? `

LEARNING-INFORMED TONE:
- Overall completion: ${userLearnings.overallCompletionRate}%${userLearnings.overallCompletionRate < 50 ? " — mention in reality_check that planning fewer tasks builds momentum" : ""}
- Do-first success: ${userLearnings.doFirstSuccess}%${userLearnings.doFirstSuccess >= 80 ? " — reinforce in headline or reality_check (\"Your strength is following through on priorities\")" : ""}
${userLearnings.weakCategories.length > 0 ? `- Weak categories: ${userLearnings.weakCategories.join(", ")} — add validation (\"These tasks are tough — start small\")` : ""}
${userLearnings.overcommitmentWarning ? "- OVERCOMMITMENT pattern detected — warn in real_talk about planning less" : ""}
${userLearnings.recurringIssues.length > 0 ? `- Recurring items: ${userLearnings.recurringIssues.map((i) => `"${i.title}" (${i.count}x)`).join(", ")} — ask in notes if these are blocked or truly doable` : ""}` : ""}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from generate");
  }

  let plan: GeneratedPlanOutput;
  try {
    plan = JSON.parse(extractJSON(content.text));
  } catch {
    console.error("[LLM Generate] Failed to parse JSON. Raw text:", content.text.substring(0, 500));
    throw new Error("LLM generation failed: invalid JSON response");
  }

  // Enforce the hard cap on active tasks
  // First, cap do_first if it exceeds the total limit on its own
  if ((plan.do_first?.length || 0) > maxTasks) {
    const doFirstOverflow = plan.do_first.splice(maxTasks);
    for (const item of doFirstOverflow) {
      plan.this_week.unshift({
        title: item.title,
        time_estimate: item.time_estimate,
        category: "other",
        notes: item.why || item.context || "",
      });
    }
  }
  // Then, cap total active tasks
  const totalActive = (plan.do_first?.length || 0) + (plan.this_week?.length || 0);
  if (totalActive > maxTasks) {
    const overflow = plan.this_week.splice(maxTasks - plan.do_first.length);
    for (const item of overflow) {
      plan.not_this_week.push({
        title: item.title,
        reason: "Over capacity for " + periodLabel + ".",
        validation: "This matters. We just ran out of space. It's next on the list.",
      });
    }
  }

  // For 1-2 tasks, force empty next_week_preview even if LLM ignored the instruction
  if (parsedData.tasks.length <= 2) {
    plan.next_week_preview = "";
  }

  return plan;
}

// ─── Crisis Plan (overwhelm >= 9) ───

export function generateCrisisPlan(): GeneratedPlanOutput {
  return {
    headline: "You're overwhelmed. Let's not add more to your plate.",
    burnout_alert:
      "Your brain dump suggests you're approaching or in burnout. This plan is designed to give you breathing room, not more pressure. Please consider talking to someone you trust — a friend, a therapist, or your manager.",
    do_first: [
      {
        title: "Take a 15-minute break away from screens",
        time_estimate: "15 min",
        why: "Your body and mind need a reset before planning anything else.",
        context: "Step outside, drink water, breathe. This is the most productive thing you can do right now.",
      },
    ],
    this_week: [
      {
        title: "Pick one thing that reduces anxiety the most",
        time_estimate: "30-60 min",
        category: "life",
        notes: "Look at your brain dump. Which single item, if done, would give you the most relief? Do just that one thing. Everything else can wait.",
      },
    ],
    not_this_week: [
      {
        title: "Everything else from your brain dump",
        reason: "You're overloaded. Adding tasks right now won't help.",
        validation: "These things matter. They're real. But you need to recover first. Next week, when you have more space, we'll revisit them together.",
      },
    ],
    reality_check:
      "You tried to fit too much into too little time and energy. That's not a failure — it's a signal. The real fix isn't a better plan, it's fewer commitments.",
    real_talk:
      "If this level of overwhelm is recurring, it might not be a planning problem. It could be a workload problem, a boundaries problem, or a burnout signal. Please talk to someone — a manager, a therapist, a friend. You deserve support.",
    next_week_preview:
      "Once you've rested, come back and we'll build a lighter plan together. No pressure.",
  };
}

// ─── Main Orchestrator ───

export async function generateFullPlan(
  dump: string,
  constraints: UserConstraints,
  mode: string = "week",
  userLearnings?: LearningsSummary | null
): Promise<{
  parsed: ParsedDump;
  scored: ScoredTasksResult;
  plan: GeneratedPlanOutput;
}> {
  // Step 1: Parse + Score in one call
  const { parsed, scored } = await analyseAndScore(dump, constraints, mode, userLearnings);

  // Step 2: Check for crisis level
  if (parsed.emotional_context.overall_overwhelm_level >= 9) {
    return {
      parsed,
      scored: {
        scored_tasks: [],
        capacity_analysis: {
          hours_available: 0,
          hours_already_committed: 0,
          hours_for_discretionary: 0,
          recommended_task_count: 1,
          user_is_overloaded: true,
          burnout_risk: "critical",
        },
        veto_filter_applied: [],
        quick_wins_identified: [],
        recommendation: "User is in crisis. Minimal plan generated.",
      },
      plan: generateCrisisPlan(),
    };
  }

  // Step 3: Generate plan text
  const plan = await generatePlanText(dump, parsed, scored, constraints, mode, userLearnings);

  return { parsed, scored, plan };
}
