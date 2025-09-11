import clientPromise from "../../../../lib/mongodb";
import { NextResponse } from "next/server";

// Helper: resolve role from headers, cookies, or query (?username=)
async function resolveRole(req: Request): Promise<string | null> {
  try {
    const roleHeader = req.headers.get("x-role");
    if (roleHeader) return roleHeader;
    // try cookies
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
    return (user as any)?.role ?? null;
  } catch {
    return null;
  }
}

// Helper: resolve user display name from headers, cookies, or query
async function resolveUserDisplay(req: Request): Promise<string | null> {
  try {
    const displayHeader = req.headers.get("x-display");
    if (displayHeader) return displayHeader;
    
    // try cookies
    const cookie = req.headers.get("cookie") || "";
    const displayFromCookie = cookie.match(/(?:^|; )display=([^;]*)/);
    if (displayFromCookie) return decodeURIComponent(displayFromCookie[1]);
    
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
      { projection: { display: 1, username: 1 } }
    );
    
    return (user as any)?.display || (user as any)?.username || null;
  } catch {
    return null;
  }
}

interface StockRecord {
  date: number;
  stock: number;
}

interface Device {
  id: number;
  name: string;
  initialStock: number;
  stockRecords: StockRecord[];
}

interface CabinetData {
  id: number;
  name: string;
  month: number;
  year: number;
  devices: Device[];
  lastUpdated: Date;
  lastUpdatedBy?: string;
}

// GET /api/stock
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const month = url.searchParams.get("month");
    const year = url.searchParams.get("year");

    const client = await clientPromise;
    const db = client.db("OR");
    const collection = db.collection<CabinetData>("lockers");

    if (id && month && year) {
      const cabinet = await collection.findOne({
        id: Number(id),
        month: Number(month),
        year: Number(year),
      });

      if (!cabinet) {
        return NextResponse.json({ error: "Cabinet not found" }, { status: 404 });
      }
      return NextResponse.json(cabinet);
    } else {
      // Summary per cabinet: include number of tables, and the month/year of the most recent record
      const summary = await collection
        .aggregate([
          { $sort: { id: 1, lastUpdated: -1 } },
          {
            $group: {
              _id: "$id",
              tableCount: { $sum: 1 },
              lastUpdated: { $first: "$lastUpdated" },
              lastUpdatedBy: { $first: "$lastUpdatedBy" },
              month: { $first: "$month" },
              year: { $first: "$year" },
              name: { $first: "$name" },
            },
          },
          { $project: { _id: 0, id: "$_id", tableCount: 1, lastUpdated: 1, lastUpdatedBy: 1, month: 1, year: 1, name: 1 } },
          { $sort: { id: 1 } },
        ])
        .toArray();

      return NextResponse.json(summary);
    }
  } catch (error) {
    console.error("❌ GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

// POST /api/stock
export async function POST(req: Request) {
  try {
    const role = await resolveRole(req);
    if (role !== "admin" && role !== "operator") {
      return NextResponse.json({ error: "ต้องเป็น admin หรือ operator เท่านั้น" }, { status: 403 });
    }
    const userDisplay = await resolveUserDisplay(req);
    const body: CabinetData = await req.json();

    const client = await clientPromise;
    const db = client.db("OR");
    const collection = db.collection<CabinetData>("lockers");

    // Normalize and validate payload
    const id = Number((body as any).id);
    const month = Number((body as any).month);
    const year = Number((body as any).year);

    if (!Number.isFinite(id) || !Number.isFinite(month) || !Number.isFinite(year)) {
      return NextResponse.json({ error: "Invalid id/month/year" }, { status: 400 });
    }
    const name = (body as any).name ?? `ตู้ ${id}`;
    const devices = Array.isArray((body as any).devices) ? (body as any).devices : [];

    const normalizedDevices = devices.map((dv: any, idx: number) => ({
      id: Number(dv?.id ?? idx + 1),
      name: String(dv?.name ?? `อุปกรณ์ ${idx + 1}`),
      initialStock: Number(dv?.initialStock ?? 0),
      stockRecords: Array.isArray(dv?.stockRecords)
        ? dv.stockRecords.map((r: any) => ({ date: Number(r?.date ?? 0), stock: Number(r?.stock ?? 0) }))
        : [],
    }));

    const doc: CabinetData = {
      id,
      month,
      year,
      name,
      devices: normalizedDevices,
      lastUpdated: new Date(),
      lastUpdatedBy: userDisplay || "Unknown",
    } as any;

    await collection.replaceOne(
      { id, month, year },
      doc,
      { upsert: true }
    );

    return NextResponse.json({ success: true, lastUpdated: (doc.lastUpdated as Date).toISOString() });
  } catch (error: any) {
    console.error("❌ POST Error:", error);
    return NextResponse.json({ error: error?.message || "Failed to save data" }, { status: 500 });
  }
}

// PUT /api/stock
export async function PUT(req: Request) {
  try {
    const role = await resolveRole(req);
    if (role !== "admin" && role !== "operator") {
      return NextResponse.json({ error: "ต้องเป็น admin หรือ operator เท่านั้น" }, { status: 403 });
    }
    const userDisplay = await resolveUserDisplay(req);
    const body = await req.json() as any;
    const { cabinetId, deviceId, year, month } = body as {
      cabinetId: number;
      deviceId: number;
      year: number;
      month: number;
    };

    const client = await clientPromise;
    const db = client.db("OR");
    const collection = db.collection<CabinetData>("lockers");

    // 1) Update a specific day's stock
    if (typeof body.day === "number" && typeof body.stock === "number") {
      const { day, stock } = body as { day: number; stock: number };
      const result = await collection.updateOne(
        { id: cabinetId, year, month, "devices.id": deviceId },
        {
          $set: {
            "devices.$.stockRecords.$[elem].stock": stock,
            lastUpdated: new Date(),
            lastUpdatedBy: userDisplay || "Unknown",
          },
        },
        {
          arrayFilters: [{ "elem.date": day }],
        }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json({ error: "Cabinet or device not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    }

    // 2) Update device name
    if (typeof body.name === "string") {
      const { name } = body as { name: string };
      const result = await collection.updateOne(
        { id: cabinetId, year, month, "devices.id": deviceId },
        {
          $set: {
            "devices.$.name": name,
            lastUpdated: new Date(),
            lastUpdatedBy: userDisplay || "Unknown",
          },
        }
      );
      if (result.matchedCount === 0) {
        return NextResponse.json({ error: "Cabinet or device not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    }

    // 3) Update device initialStock
    if (typeof body.initialStock === "number") {
      const { initialStock } = body as { initialStock: number };
      const result = await collection.updateOne(
        { id: cabinetId, year, month, "devices.id": deviceId },
        {
          $set: {
            "devices.$.initialStock": initialStock,
            lastUpdated: new Date(),
            lastUpdatedBy: userDisplay || "Unknown",
          },
        }
      );
      if (result.matchedCount === 0) {
        return NextResponse.json({ error: "Cabinet or device not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unsupported update payload" }, { status: 400 });
  } catch (error: any) {
    console.error("❌ PUT Error:", error);
    return NextResponse.json({ error: error?.message || "Failed to update" }, { status: 500 });
  }
}
