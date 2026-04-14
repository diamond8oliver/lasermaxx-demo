import { NextRequest, NextResponse } from "next/server";
import { seedDemoData } from "@/lib/demo-seed";

// POST /api/demo/reseed — Regenerate demo data with today's dates
// Called by Vercel cron daily + lazy-triggered when no games exist
export async function POST(request: NextRequest) {
  try {
    // Simple auth: only allow from cron or with secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Allow if: no secret configured, or secret matches, or Vercel cron header present
    const isVercelCron = request.headers.get("x-vercel-cron") === "true";
    const isAuthorized =
      !cronSecret ||
      authHeader === `Bearer ${cronSecret}` ||
      isVercelCron;

    // Also allow internal calls (no auth needed for lazy reseed)
    const isInternal = request.headers.get("x-internal") === "true";

    if (!isAuthorized && !isInternal) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await seedDemoData();
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/demo/reseed error:", error);
    return NextResponse.json(
      { error: "Failed to reseed demo data" },
      { status: 500 }
    );
  }
}

// GET handler for Vercel cron (cron jobs use GET)
export async function GET(request: NextRequest) {
  try {
    const result = await seedDemoData();
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/demo/reseed error:", error);
    return NextResponse.json(
      { error: "Failed to reseed demo data" },
      { status: 500 }
    );
  }
}
