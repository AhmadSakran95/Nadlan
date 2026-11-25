import { NextRequest, NextResponse } from "next/server";
import { createAdminSession } from "@/lib/auth";
import { timingSafeEqual } from "crypto";
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const expectedEmail = process.env.ADMIN_EMAIL || "";
    const expectedPassword = process.env.ADMIN_PASSWORD || "";
    const safeEq = (a:string,b:string) => { try { return timingSafeEqual(Buffer.from(a),Buffer.from(b)); } catch { return false; } };
    if (!expectedEmail || !expectedPassword || !safeEq(String(email || ""), expectedEmail) || !safeEq(String(password || ""), expectedPassword))
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    await createAdminSession();
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Login failed" }, { status: 400 }); }
}
