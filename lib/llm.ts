import Anthropic from "@anthropic-ai/sdk";
import { ParsedDump } from "@/types";

const client = new Anthropic();

export async function parseBrainDump(dump: string): Promise<ParsedDump> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are a planning assistant. Extract tasks from this brain dump.

Return ONLY valid JSON (no markdown, no explanation):
{
  "tasks": [
    {
      "title": "Clean, action-oriented title (5-10 words)",
      "effort": "small|medium|large",
      "urgency": "low|medium|high",
      "deadline": "YYYY-MM-DD or null",
      "category": "work|health|home|money|other"
    }
  ],
  "themes": ["theme1", "theme2"]
}

Rules:
- Use British English spelling throughout (e.g. organise, prioritise, colour, centre)
- "effort": small = <30min, medium = 30min-2hrs, large = 2hrs+
- "urgency": high = mentioned deadline within 3 days or "asap"/"urgent", medium = this week, low = no deadline
- "deadline": only if explicitly mentioned (e.g. "by Friday", "due Wed"). Infer dates from context. Current date is ${new Date().toISOString().split("T")[0]}.
- "category": infer from context (exercise/gym/run = health, groceries/cleaning = home, etc.)
- Extract every actionable item, even small ones

Brain dump:
${dump}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type");
  }

  // Try to extract JSON from the response (handle markdown code blocks)
  let jsonStr = content.text.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  return JSON.parse(jsonStr);
}

export async function generatePlanText(
  tasks: { title: string; effort: string; urgency: string; category: string }[]
): Promise<
  { title: string; timeEstimate: string; context: string | null }[]
> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Generate friendly task descriptions for a weekly plan. Return ONLY valid JSON (no markdown).

Tasks: ${JSON.stringify(tasks)}

Return a JSON array:
[
  {
    "title": "Clean, action-oriented title (5-10 words)",
    "timeEstimate": "20-30 min" or "1-2 hrs",
    "context": "Brief context if there's a deadline, otherwise null"
  }
]

Rules:
- Use British English spelling throughout (e.g. organise, prioritise, colour, centre)
- Keep titles concise and action-oriented
- Time estimates should be realistic ranges
- Be warm and encouraging in tone
- Do NOT use pressure language like "crush it" or "hustle"`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type");
  }

  let jsonStr = content.text.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  return JSON.parse(jsonStr);
}
