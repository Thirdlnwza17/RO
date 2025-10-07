import { NextRequest, NextResponse } from "next/server";
import clientPromise from "../../../../../lib/mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Allow both admin and operator to read display name for UX
    const { id: employeeId } = await params;
    
    if (!employeeId) {
      return NextResponse.json(
        { error: "รหัสพนักงานของท่านไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("OR");

    // Find user by employee ID
    const user = await db.collection("users").findOne({ 
      username: employeeId 
    }, {
      projection: { 
        _id: 0,
        display: 1,
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลพนักงาน" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        display: user.display 
      }
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการค้นหาข้อมูลพนักงาน" },
      { status: 500 }
    );
  }
}
