// Current user (or null) for the client-side user menu.

import { currentUser } from "@/lib/auth/session";

export async function GET() {
  const user = await currentUser();
  return Response.json({ user });
}
