"use server";

// Mutations for the monitors page. Each enforces login + the plan's monitor cap
// server-side before touching the DB.

import { revalidatePath } from "next/cache";
import { assertSafeUrl } from "@/lib/seo/safe-fetch";
import { currentUser } from "@/lib/auth/session";
import { planOf } from "@/lib/auth/plan";
import { addMonitor, deleteMonitor, setMonitorEnabled, listMonitors } from "@/lib/db/monitors";

export async function createMonitor(formData) {
  const user = await currentUser();
  if (!user) return;

  const existing = await listMonitors(user.id);
  if (existing.length >= planOf(user).monitors) return; // cap reached

  const raw = String(formData.get("url") || "");
  let safe;
  try {
    safe = assertSafeUrl(raw);
  } catch {
    return; // invalid URL — ignore
  }
  const cadence = String(formData.get("cadence") || "weekly");
  const deep = formData.get("deep") === "on" || formData.get("deep") === "1";

  await addMonitor(user.id, { url: safe.toString(), cadence, deep });
  revalidatePath("/monitors");
}

export async function removeMonitor(formData) {
  const user = await currentUser();
  if (!user) return;
  await deleteMonitor(user.id, String(formData.get("id") || ""));
  revalidatePath("/monitors");
}

export async function toggleMonitor(formData) {
  const user = await currentUser();
  if (!user) return;
  const id = String(formData.get("id") || "");
  const enabled = formData.get("enabled") === "true";
  await setMonitorEnabled(user.id, id, !enabled); // flip
  revalidatePath("/monitors");
}
