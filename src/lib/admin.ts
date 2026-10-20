import type { Db } from "mongodb";
import { OWNER_USER_ID, userIdFromEmail } from "@/lib/auth";
import { opaqueId } from "@/lib/ranking";

/**
 * Admins may read every user's study details, not just their own.
 *
 * Configured with `ADMIN_USER_IDS` (comma-separated app user ids or Google
 * emails). Left unset, the owner is the only admin. This is checked on the
 * server for every request; the client only ever learns the yes/no answer.
 */
function adminUserIds(): string[] {
  const configured = (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  // An email is mapped the same way sign-in maps it, so the owner's address
  // and their legacy id both name the same account.
  return (configured.length > 0 ? configured : [OWNER_USER_ID]).map((entry) =>
    entry.includes("@") ? userIdFromEmail(entry) ?? entry : entry
  );
}

export function isAdmin(userId: string): boolean {
  return adminUserIds().includes(userId);
}

export type ReportOwner =
  | { ok: true; userId: string }
  | { ok: false; status: 403 | 404; message: string };

/**
 * Whose report a request reads.
 *
 * Without a handle it's the caller. With one — the opaque id the ranking hands
 * out — it's that user, and only an admin may ask. Raw ids are emails, so they
 * never travel to the client; the handle is matched back here by hashing the
 * known ids, which is cheap at this app's scale and reveals nothing to a
 * non-admin probing for handles (they get 403 before any lookup).
 */
export async function resolveReportOwner(
  db: Db,
  callerId: string,
  handle: unknown
): Promise<ReportOwner> {
  if (typeof handle !== "string" || handle === "") {
    return { ok: true, userId: callerId };
  }
  if (!isAdmin(callerId)) {
    return { ok: false, status: 403, message: "Forbidden" };
  }

  const userIds: string[] = await db.collection("pomodoroSessions").distinct("userId");
  const userId = userIds.find((id) => opaqueId(id) === handle);
  return userId
    ? { ok: true, userId }
    : { ok: false, status: 404, message: "User not found" };
}
