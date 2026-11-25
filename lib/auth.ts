import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE = "nadlan_admin";
function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters.");
  return value;
}
function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}
export async function createAdminSession() {
  const value = `${Date.now()}`;
  const jar = await cookies();
  jar.set(COOKIE, `${value}.${sign(value)}`, {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/", maxAge: 60 * 60 * 12
  });
}
export async function isAdmin() {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return false;
  const [value, signature] = raw.split(".");
  if (!value || !signature) return false;
  const expected = sign(value);
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) &&
      Date.now() - Number(value) < 12 * 60 * 60 * 1000;
  } catch { return false; }
}
export async function destroyAdminSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}
