import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";

// Helper: resolve role from headers, cookies, or query (?username=)
async function resolveRole(req: Request): Promise<string | null> {
  try {
    const roleHeader = req.headers.get("x-role");
    if (roleHeader) return roleHeader;
    const cookie = req.headers.get("cookie") || "";
    const roleFromCookie = cookie.match(/(?:^|; )role=([^;]*)/);
    if (roleFromCookie) return decodeURIComponent(roleFromCookie[1]);
    const url = new URL(req.url);
    const username = req.headers.get("x-username") || url.searchParams.get("username") || (() => {
      const m = cookie.match(/(?:^|; )username=([^;]*)/);
      return m ? decodeURIComponent(m[1]) : null;
    })();
    if (!username) return null;
    const client = await clientPromise;
    const db = client.db("OR");
    const user = await db.collection("users").findOne(
      { username },
      { projection: { role: 1 } }
    );
    return (user as { role?: string })?.role ?? null;
  } catch {
    return null;
  }
}

// GET /api/users -> list basic users from OR DB with display & username only
export async function GET(req: Request) {
  try {
    // Allow listing for now to avoid blocking header fallback; restrict later in UI
    const client = await clientPromise;
    const db = client.db("OR");
    const users = await db
      .collection("users")
      .find({}, { projection: { _id: 0, display: 1, username: 1 } })
      .toArray();
    return NextResponse.json({ users });
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

// POST /api/users -> still allow insert; write to OR DB for consistency
export async function POST(req: Request) {
  try {
    const role = await resolveRole(req);
    if (role !== "admin") {
      return NextResponse.json({ error: "ต้องเป็นผู้ดูแลระบบ (admin) เท่านั้น" }, { status: 403 });
    }
    const body = await req.json();
    const client = await clientPromise;
    const db = client.db("OR");
    const result = await db.collection("users").insertOne(body);
    return NextResponse.json({ insertedId: result.insertedId });
  } catch (e) {
    return NextResponse.json({ error: "Failed to insert user" }, { status: 500 });
  }
}
