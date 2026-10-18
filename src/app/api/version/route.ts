import { NextResponse } from "next/server";
import { getGoogleAuth, formatPrivateKey } from "@/lib/googleSheets";

export async function GET() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "missing";
  const rawKey = process.env.GOOGLE_PRIVATE_KEY || "";
  const formattedKey = formatPrivateKey(rawKey);
  const lines = formattedKey.split("\n");
  
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
    formattedKeyLength: formattedKey.length,
    lineCount: lines.length,
    firstLine: lines[0],
    secondLine: lines[1]?.slice(0, 20),
    lastLine: lines[lines.length - 1],
    secondLastLine: lines[lines.length - 2],
    authStatus,
    authError,
  });
}
