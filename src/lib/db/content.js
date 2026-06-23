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
      RETURNING id, profile_id, kind, topic, platforms, title, markdown, data, status, scheduled_for, created_at`;
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
            SELECT id, profile_id, kind, topic, platforms, title, markdown, data, status, scheduled_for, created_at
            FROM generated_content WHERE user_id = ${userId} AND kind = ${kind}
            ORDER BY created_at DESC LIMIT ${limit}`
        : await sql`
            SELECT id, profile_id, kind, topic, platforms, title, markdown, data, status, scheduled_for, created_at
            FROM generated_content WHERE user_id = ${userId}
            ORDER BY created_at DESC LIMIT ${limit}`;
    }
    return kind
      ? await sql`
          SELECT id, profile_id, kind, topic, platforms, title, markdown, data, status, scheduled_for, created_at
          FROM generated_content WHERE user_id IS NULL AND kind = ${kind}
          ORDER BY created_at DESC LIMIT ${limit}`
      : await sql`
          SELECT id, profile_id, kind, topic, platforms, title, markdown, data, status, scheduled_for, created_at
          FROM generated_content WHERE user_id IS NULL
          ORDER BY created_at DESC LIMIT ${limit}`;
  } catch {
    return [];
  }
}

// Today's generated idea rows joined to their owner's email — drives the daily
// email digest. Each row's data.ideas holds the idea objects.
export async function todaysIdeaRows() {
  if (!sql) return [];
  try {
    return await sql`
      SELECT g.user_id, u.email, g.topic, g.data
      FROM generated_content g
      JOIN users u ON u.id = g.user_id
      WHERE g.kind = 'idea'
        AND g.created_at >= date_trunc('day', now())
        AND u.email IS NOT NULL
      ORDER BY g.user_id`;
  } catch {
    return [];
  }
}

export async function getContent(id, userId = null) {
  if (!sql || !id) return null;
  try {
    const rows = userId
      ? await sql`
          SELECT id, profile_id, kind, topic, platforms, title, markdown, data, status, scheduled_for, created_at
          FROM generated_content WHERE id = ${id} AND user_id = ${userId} LIMIT 1`
      : await sql`
          SELECT id, profile_id, kind, topic, platforms, title, markdown, data, status, scheduled_for, created_at
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
          RETURNING id, profile_id, kind, topic, platforms, title, markdown, data, status, scheduled_for, created_at`
      : await sql`
          UPDATE generated_content SET status = ${status}
          WHERE id = ${id} AND user_id IS NULL
          RETURNING id, profile_id, kind, topic, platforms, title, markdown, data, status, scheduled_for, created_at`;
    return rows[0] || null;
  } catch {
    return null;
  }
}

// Set/clear a content item's scheduled date (calendar). scheduledFor is an ISO
// string or null (to unschedule). User-scoped.
export async function updateContentSchedule(id, userId, scheduledFor) {
  if (!sql || !id) return null;
  try {
    const rows = userId
      ? await sql`
          UPDATE generated_content SET scheduled_for = ${scheduledFor}
          WHERE id = ${id} AND user_id = ${userId}
          RETURNING id, profile_id, kind, topic, platforms, title, markdown, data, status, scheduled_for, created_at`
      : await sql`
          UPDATE generated_content SET scheduled_for = ${scheduledFor}
          WHERE id = ${id} AND user_id IS NULL
          RETURNING id, profile_id, kind, topic, platforms, title, markdown, data, status, scheduled_for, created_at`;
    return rows[0] || null;
  } catch {
    return null;
  }
}

// Content scheduled within [fromISO, toISO) — drives the calendar view.
export async function scheduledContent(userId, fromISO, toISO) {
  if (!sql) return [];
  try {
    return userId
      ? await sql`
          SELECT id, kind, topic, title, status, scheduled_for, created_at
          FROM generated_content
          WHERE user_id = ${userId} AND scheduled_for >= ${fromISO} AND scheduled_for < ${toISO}
          ORDER BY scheduled_for ASC`
      : await sql`
          SELECT id, kind, topic, title, status, scheduled_for, created_at
          FROM generated_content
          WHERE user_id IS NULL AND scheduled_for >= ${fromISO} AND scheduled_for < ${toISO}
          ORDER BY scheduled_for ASC`;
  } catch {
    return [];
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
