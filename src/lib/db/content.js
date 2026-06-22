// Generated content history: AI-written articles and social post sets, scoped
// per user. All best-effort — returns null/[] when the DB is unavailable.

import { sql } from "../db";

export async function saveContent({
  userId = null,
  profileId = null,
  kind,
  topic = null,
  platforms = null,
  title = null,
  markdown = null,
  data = null,
  status = "draft",
}) {
  if (!sql) return null;
  try {
    const rows = await sql`
      INSERT INTO generated_content (user_id, profile_id, kind, topic, platforms, title, markdown, data, status)
      VALUES (
        ${userId},
        ${profileId},
        ${kind},
        ${topic},
        ${platforms},
        ${title},
        ${markdown},
        ${data ? JSON.stringify(data) : null}::jsonb,
        ${status}
      )
      RETURNING id, profile_id, kind, topic, platforms, title, markdown, data, status, created_at`;
    return rows[0] || null;
  } catch {
    return null;
  }
}

// List saved content for a user, optionally filtered by kind (article | social).
export async function listContent(userId = null, { kind = null, limit = 30 } = {}) {
  if (!sql) return [];
  try {
    if (userId) {
      return kind
        ? await sql`
            SELECT id, profile_id, kind, topic, platforms, title, markdown, data, status, created_at
            FROM generated_content WHERE user_id = ${userId} AND kind = ${kind}
            ORDER BY created_at DESC LIMIT ${limit}`
        : await sql`
            SELECT id, profile_id, kind, topic, platforms, title, markdown, data, status, created_at
            FROM generated_content WHERE user_id = ${userId}
            ORDER BY created_at DESC LIMIT ${limit}`;
    }
    return kind
      ? await sql`
          SELECT id, profile_id, kind, topic, platforms, title, markdown, data, status, created_at
          FROM generated_content WHERE user_id IS NULL AND kind = ${kind}
          ORDER BY created_at DESC LIMIT ${limit}`
      : await sql`
          SELECT id, profile_id, kind, topic, platforms, title, markdown, data, status, created_at
          FROM generated_content WHERE user_id IS NULL
          ORDER BY created_at DESC LIMIT ${limit}`;
  } catch {
    return [];
  }
}

export async function getContent(id, userId = null) {
  if (!sql || !id) return null;
  try {
    const rows = userId
      ? await sql`
          SELECT id, profile_id, kind, topic, platforms, title, markdown, data, status, created_at
          FROM generated_content WHERE id = ${id} AND user_id = ${userId} LIMIT 1`
      : await sql`
          SELECT id, profile_id, kind, topic, platforms, title, markdown, data, status, created_at
          FROM generated_content WHERE id = ${id} AND user_id IS NULL LIMIT 1`;
    return rows[0] || null;
  } catch {
    return null;
  }
}

// Review-and-approve loop: move a saved item between draft and approved.
const CONTENT_STATUSES = new Set(["draft", "approved"]);

export async function updateContentStatus(id, userId, status) {
  if (!sql || !id || !CONTENT_STATUSES.has(status)) return null;
  try {
    const rows = userId
      ? await sql`
          UPDATE generated_content SET status = ${status}
          WHERE id = ${id} AND user_id = ${userId}
          RETURNING id, profile_id, kind, topic, platforms, title, markdown, data, status, created_at`
      : await sql`
          UPDATE generated_content SET status = ${status}
          WHERE id = ${id} AND user_id IS NULL
          RETURNING id, profile_id, kind, topic, platforms, title, markdown, data, status, created_at`;
    return rows[0] || null;
  } catch {
    return null;
  }
}

export async function deleteContent(id, userId) {
  if (!sql || !id) return false;
  try {
    const rows = userId
      ? await sql`DELETE FROM generated_content WHERE id = ${id} AND user_id = ${userId} RETURNING id`
      : await sql`DELETE FROM generated_content WHERE id = ${id} AND user_id IS NULL RETURNING id`;
    return rows.length > 0;
  } catch {
    return false;
  }
}
