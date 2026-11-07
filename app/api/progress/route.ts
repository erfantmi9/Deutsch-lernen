import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { progress } from "@/lib/db/schema";
import { isSyncedKey } from "@/lib/syncKeys";

export const dynamic = "force-dynamic";

const putSchema = z.object({
  items: z
    .array(
      z.object({
        storeKey: z.string().refine(isSyncedKey, "unknown store"),
        data: z.unknown(),
        updatedAt: z.number().int().positive(),
      }),
    )
    .max(20),
});

const MAX_BYTES = 512 * 1024;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = await getDb().select().from(progress).where(eq(progress.userId, session.user.id));
  return NextResponse.json({
    items: rows.map((r) => ({ storeKey: r.storeKey, data: r.data, updatedAt: r.updatedAt.getTime() })),
  });
}

export async function PUT(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.text();
  if (body.length > MAX_BYTES) return NextResponse.json({ error: "too large" }, { status: 413 });
  const parsed = putSchema.safeParse(JSON.parse(body || "{}"));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const db = getDb();
  for (const item of parsed.data.items) {
    const updatedAt = new Date(item.updatedAt);
    await db
      .insert(progress)
      .values({ userId, storeKey: item.storeKey, data: item.data, updatedAt })
      .onConflictDoUpdate({
        target: [progress.userId, progress.storeKey],
        set: { data: item.data, updatedAt },
        // Never overwrite newer data that another device already saved.
        setWhere: sql`${progress.updatedAt} < ${updatedAt}`,
      });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await getDb().delete(progress).where(and(eq(progress.userId, session.user.id)));
  return NextResponse.json({ ok: true });
}
