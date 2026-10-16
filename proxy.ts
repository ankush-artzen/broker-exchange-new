import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const corsOptions = {
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

function isLocalOrigin(origin: string) {
  try {
    const host = new URL(origin).hostname;
    if (host === "localhost" || host === "127.0.0.1") return true;
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
    return /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host);
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  const allowed = isLocalOrigin(origin);

  if (request.method === "OPTIONS") {
    return NextResponse.json(
      {},
      {
        headers: {
          ...(allowed ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
          ...corsOptions,
        },
      },
    );
  }

  const response = NextResponse.next();
  if (allowed) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
  }
  for (const [key, value] of Object.entries(corsOptions)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
