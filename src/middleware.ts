import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
const USER = process.env.SITE_USER!;
const PASS = process.env.SITE_PASS!;

export function middleware(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (authHeader) {
    const auth = authHeader.split(" ")[1];
    const [user, pass] = Buffer.from(auth, "base64").toString().split(":");

    if (user === USER && pass === PASS) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Secure Area"',
    },
  });
}

export const config = {
    matcher: ["/((?!api).*)"],
  };