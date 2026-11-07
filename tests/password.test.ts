import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";
import { signUpSchema } from "@/lib/authSchemas";

describe("password hashing", () => {
  it("verifies the right password and rejects others", async () => {
    const hash = await hashPassword("correct horse");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse", hash)).toBe(true);
    expect(await verifyPassword("wrong horse", hash)).toBe(false);
  });

  it("uses a new salt each time", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });

  it("rejects missing or malformed hashes", async () => {
    expect(await verifyPassword("x", null)).toBe(false);
    expect(await verifyPassword("x", "plain")).toBe(false);
  });
});

describe("sign-up input", () => {
  it("needs a full name, a valid email and 8+ characters", () => {
    expect(signUpSchema.safeParse({ name: "Anna Muster", email: " Anna@Example.com ", password: "12345678" }).data?.email).toBe(
      "anna@example.com",
    );
    expect(signUpSchema.safeParse({ name: "", email: "a@b.de", password: "12345678" }).success).toBe(false);
    expect(signUpSchema.safeParse({ name: "Anna", email: "not-an-email", password: "12345678" }).success).toBe(false);
    expect(signUpSchema.safeParse({ name: "Anna", email: "a@b.de", password: "short" }).success).toBe(false);
  });
});
