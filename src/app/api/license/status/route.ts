import { NextResponse } from "next/server";
import { getLicenseStatus } from "@/lib/license";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = getLicenseStatus();
  return NextResponse.json({
    success: true,
    ...status,
  });
}
