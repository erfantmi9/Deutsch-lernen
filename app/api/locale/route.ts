import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

const putSchema = z.object({ locale: z.enum(routing.locales) });

/** The signed-in learner's saved interface language, or null when they never picked one. */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const [row] = await getDb().select({ locale: users.locale }).from(users).where(eq(users.id, userId)).limit(1);
  const locale = (routing.locales as readonly string[]).includes(row?.locale ?? "") ? row!.locale : null;
  return NextResponse.json({ locale });
}

export async function PUT(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = putSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  await getDb().update(users).set({ locale: parsed.data.locale }).where(eq(users.id, userId));
  return NextResponse.json({ ok: true });
}
