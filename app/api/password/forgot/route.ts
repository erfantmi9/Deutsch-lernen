import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { passwordResets, users } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { clientIp, hit } from "@/lib/rateLimit";
import { siteUrl } from "@/lib/site";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  locale: z.enum(routing.locales).catch("en"),
});

const SUBJECT = {
  en: "Reset your Deutsch Lernen password",
  de: "Passwort für Deutsch Lernen zurücksetzen",
  fa: "بازنشانی رمز عبور Deutsch Lernen",
} as const;

const BODY = {
  en: (url: string) => `Someone asked to reset the password for this email.\n\nOpen this link within 1 hour to choose a new password:\n${url}\n\nIf it wasn't you, ignore this email.`,
  de: (url: string) => `Jemand möchte das Passwort für diese E-Mail zurücksetzen.\n\nÖffne diesen Link innerhalb von 1 Stunde und wähle ein neues Passwort:\n${url}\n\nWarst du das nicht, ignoriere diese E-Mail.`,
  fa: (url: string) => `کسی درخواست بازنشانی رمز عبور این ایمیل را داده است.\n\nتا ۱ ساعت این پیوند را باز کنید و رمز تازه بگذارید:\n${url}\n\nاگر شما نبودید، این ایمیل را نادیده بگیرید.`,
} as const;

/** Always answers 200, so the form can't be used to find out which emails have accounts. */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { email, locale } = parsed.data;

  const ip = clientIp(req.headers);
  if (!(await hit(`forgot:ip:${ip}`, 10, 3600)) || !(await hit(`forgot:email:${email}`, 3, 3600))) {
    return NextResponse.json({ error: "rate" }, { status: 429 });
  }

  const db = getDb();
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (user) {
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await db.delete(passwordResets).where(eq(passwordResets.userId, user.id));
    await db.insert(passwordResets).values({ tokenHash, userId: user.id, expires: new Date(Date.now() + 3600_000) });
    const url = `${siteUrl()}/${locale}/reset-password?token=${token}`;
    try {
      await sendEmail({ to: email, subject: SUBJECT[locale], text: BODY[locale](url) });
    } catch (e) {
      console.error("[forgot] email failed", e);
    }
  }
  return NextResponse.json({ ok: true });
}
