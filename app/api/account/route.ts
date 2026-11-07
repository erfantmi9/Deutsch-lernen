import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/** Deletes the signed-in account. Progress, Google links and reset links go with it (ON DELETE CASCADE). */
export async function DELETE() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await getDb().delete(users).where(eq(users.id, id));
  return NextResponse.json({ ok: true });
}
