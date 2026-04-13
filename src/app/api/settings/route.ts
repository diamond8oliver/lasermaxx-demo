import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/settings - Get all settings as key-value object
export async function GET() {
  try {
    const settings = await db.setting.findMany();

    const settingsObject: Record<string, string> = {};
    for (const s of settings) {
      settingsObject[s.key] = s.value;
    }

    return NextResponse.json(settingsObject);
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// PATCH /api/settings - Update a setting
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key || typeof key !== "string") {
      return NextResponse.json(
        { error: "key is required" },
        { status: 400 }
      );
    }

    if (value === undefined || value === null) {
      return NextResponse.json(
        { error: "value is required" },
        { status: 400 }
      );
    }

    const stringValue = String(value);

    const setting = await db.setting.upsert({
      where: { key },
      update: { value: stringValue },
      create: { key, value: stringValue },
    });

    return NextResponse.json(setting);
  } catch (error) {
    console.error("PATCH /api/settings error:", error);
    return NextResponse.json(
      { error: "Failed to update setting" },
      { status: 500 }
    );
  }
}
