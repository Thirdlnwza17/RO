import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("OR");

    // ✅ ตรวจสอบ username + password แบบ plain text
    const user = await db.collection("users").findOne({ username, password });

    if (!user) {
      return NextResponse.json(
        { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 }
      );
    }

    // ✅ อัปเดต lastLogin ในฐานข้อมูล (เวลาไทย UTC+7)
    const now = new Date();
    // แปลงเป็นเวลาไทย (UTC+7)
    const thaiTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    const thaiTimeString = thaiTime.toISOString();
    
    await db.collection("users").updateOne(
      { _id: user._id },
      { $set: { lastLogin: thaiTimeString } }
    );

    // ✅ ลบ password ออกจาก response
    const { password: _, ...userWithoutPassword } = user;

    // สร้างรูปแบบวันที่-เวลาไทย
    const thaiDateTime = thaiTime.toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const response = NextResponse.json({
      success: true,
      user: {
        ...userWithoutPassword,
        lastLogin: thaiTimeString,
        lastLoginThai: thaiDateTime
      },
      message: "เข้าสู่ระบบสำเร็จ",
      timestamp: thaiTimeString,
      timestampThai: thaiDateTime
    });

    try {
      // Set lightweight cookies for downstream authorization checks
      response.cookies.set("username", String(user.username), { path: "/" });
      if ((user as any)?.role) {
        response.cookies.set("role", String((user as any).role), { path: "/" });
      }
      if ((user as any)?.display) {
        response.cookies.set("display", String((user as any).display), { path: "/" });
      }
    } catch {}

    return response;
  } catch (error) {
    console.error("❌ Login error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" },
      { status: 500 }
    );
  }
}
