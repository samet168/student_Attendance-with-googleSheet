import { NextResponse } from "next/server";
import { getGoogleAuth } from "@/lib/googleSheets";

export async function GET() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "missing";
  const rawKey = process.env.GOOGLE_PRIVATE_KEY || "";
  
  let keyStatus = "unknown";
  try {
    getGoogleAuth();
    keyStatus = "valid";
  } catch (err: any) {
    keyStatus = "error: " + err.message;
  }

  return NextResponse.json({
    version: "2.0.0",
    commit: "dd027fb-v2",
    hasEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    hasKey: !!process.env.GOOGLE_PRIVATE_KEY,
    keyLength: rawKey.length,
    keyStartsWithBegin: rawKey.includes("BEGIN PRIVATE KEY"),
    keyStatus,
  });
}
