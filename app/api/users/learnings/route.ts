import { NextResponse } from "next/server";
import { getAuthOrAnon } from "@/lib/auth";
import { generateLearningSummary } from "@/lib/learnings";

export async function GET() {
  try {
    const auth = await getAuthOrAnon();
    const summary = await generateLearningSummary(auth.userId);

    if (!summary) {
      return NextResponse.json({ learnings: null });
    }

    return NextResponse.json({ learnings: summary });
  } catch {
    return NextResponse.json({ learnings: null });
  }
}
