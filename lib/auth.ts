import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRY = "7d";
const COOKIE_NAME = "planscope_token";
const ANON_COOKIE = "planscope_anon";

export function createToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): { userId: string } {
  return jwt.verify(token, JWT_SECRET) as { userId: string };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
    sameSite: "lax",
  });
}

export async function getAuthCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<{ userId: string } | null> {
  try {
    const token = await getAuthCookie();
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

/** Get or create an anonymous user tracked by a cookie. */
export async function getOrCreateAnonUser(): Promise<{ userId: string }> {
  const cookieStore = await cookies();
  const anonId = cookieStore.get(ANON_COOKIE)?.value;

  if (anonId) {
    const user = await prisma.user.findFirst({
      where: { email: `anon-${anonId}@planscope.local` },
    });
    if (user) return { userId: user.id };
  }

  // Create new anonymous user
  const newAnonId = anonId || crypto.randomUUID();
  const user = await prisma.user.create({
    data: {
      email: `anon-${newAnonId}@planscope.local`,
      passwordHash: "anonymous",
    },
  });

  cookieStore.set(ANON_COOKIE, newAnonId, {
    httpOnly: true,
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    sameSite: "lax",
  });

  return { userId: user.id };
}

/** Returns the authenticated user if logged in, otherwise the anonymous user. */
export async function getAuthOrAnon(): Promise<{
  userId: string;
  isAnon: boolean;
}> {
  const auth = await getCurrentUser();
  if (auth) return { ...auth, isAnon: false };

  const anon = await getOrCreateAnonUser();
  return { ...anon, isAnon: true };
}

/** Migrate plans from anonymous user to a real user on signup/login. */
export async function migrateAnonPlans(realUserId: string) {
  const cookieStore = await cookies();
  const anonId = cookieStore.get(ANON_COOKIE)?.value;
  if (!anonId) return;

  const anonUser = await prisma.user.findFirst({
    where: { email: `anon-${anonId}@planscope.local` },
  });

  if (anonUser) {
    await prisma.plan.updateMany({
      where: { userId: anonUser.id },
      data: { userId: realUserId },
    });
    await prisma.user.delete({ where: { id: anonUser.id } });
  }

  cookieStore.delete(ANON_COOKIE);
}
