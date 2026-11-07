import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { signUpSchema } from "@/lib/authSchemas";
import { hashPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

/** Creates an email + password account. The client then signs in with the Credentials provider. */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const parsed = signUpSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { name, email, password } = parsed.data;

  const db = getDb();
  // Any existing account with this address (password or Google) blocks sign-up: email is not verified here,
  // so attaching a password to someone else's Google account must not be possible.
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) return NextResponse.json({ error: "exists" }, { status: 409 });

  const passwordHash = await hashPassword(password);
  try {
    await db.insert(users).values({ name, email, passwordHash });
  } catch {
    // Unique email constraint: a parallel sign-up won the race.
    return NextResponse.json({ error: "exists" }, { status: 409 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
