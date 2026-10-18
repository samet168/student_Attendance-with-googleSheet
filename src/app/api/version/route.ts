import { NextResponse } from "next/server";
import { getGoogleAuth } from "@/lib/googleSheets";

export async function GET() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "missing";
  const rawKey = process.env.GOOGLE_PRIVATE_KEY || "";
  
  let authStatus = "unknown";
  let authError = "";
  try {
    const auth = getGoogleAuth();
    await auth.authorize();
    authStatus = "SUCCESS";
  } catch (err: any) {
    authStatus = "FAILED";
    authError = err.message || String(err);
  }

  return NextResponse.json({
    email,
    rawKeyLength: rawKey.length,
    rawKeyStart: rawKey.slice(0, 35),
    rawKeyEnd: rawKey.slice(-35),
    authStatus,
    authError,
  });
}
