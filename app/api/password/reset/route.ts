import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { passwordResets, users } from "@/lib/db/schema";
import { PASSWORD_MIN } from "@/lib/authSchemas";
import { hashPassword } from "@/lib/password";
import { clientIp, hit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const schema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(PASSWORD_MIN).max(200),
});

/** Sets a new password from a one-time link. The link stops working once used or after 1 hour. */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (!(await hit(`reset:ip:${clientIp(req.headers)}`, 20, 3600))) {
    return NextResponse.json({ error: "rate" }, { status: 429 });
  }

  const db = getDb();
  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  // Delete first: whoever deletes the row owns the token, so it can't be used twice.
  const [row] = await db.delete(passwordResets).where(eq(passwordResets.tokenHash, tokenHash)).returning();
  if (!row || row.expires.getTime() < Date.now()) {
    return NextResponse.json({ error: "expired" }, { status: 400 });
  }
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(parsed.data.password) })
    .where(eq(users.id, row.userId));
  return NextResponse.json({ ok: true });
}
