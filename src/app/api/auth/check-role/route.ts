import { NextResponse } from "next/server";
import { cookies } from 'next/headers';
import clientPromise from "../../../../../lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("OR");
    
    // Get username from cookies
    const cookieStore = cookies();
    const username = cookieStore.get('username')?.value;
    
    if (!username) {
      return NextResponse.json({ role: null });
    }
    
    const user = await db.collection("users").findOne(
      { username },
      { projection: { role: 1 } }
    );
    
    return NextResponse.json({ 
      role: user?.role || null,
      username: username
    });
    
  } catch (error) {
    console.error("Error checking role:", error);
    return NextResponse.json(
      { error: "Failed to check user role" },
      { status: 500 }
    );
  }
}
