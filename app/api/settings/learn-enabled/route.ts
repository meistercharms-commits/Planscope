import { NextRequest, NextResponse } from "next/server";
import { getAuthOrAnon } from "@/lib/auth";
import { getUser, updateUser } from "@/lib/firestore";

export async function GET() {
  try {
    const auth = await getAuthOrAnon();
    const user = await getUser(auth.userId);

    return NextResponse.json({ learnEnabled: user?.learnEnabled ?? true });
  } catch {
    return NextResponse.json({ learnEnabled: true });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthOrAnon();
    const body = await req.json();
    const { enabled } = body;

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "enabled must be a boolean" },
        { status: 400 }
      );
    }

    await updateUser(auth.userId, { learnEnabled: enabled });

    return NextResponse.json({ learnEnabled: enabled });
  } catch {
    return NextResponse.json(
      { error: "Could not update preference" },
      { status: 500 }
    );
  }
}
