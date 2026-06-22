// Brand memory profiles: a user's named Markdown descriptions of their sites.
// All best-effort — returns null/[] when the DB is unavailable. Every query is
// scoped by user_id (or anonymous rows when userId is null) to prevent
// cross-user access.

import { sql } from "../db";

export async function listProfiles(userId = null) {
  if (!sql) return [];
  try {
    return userId
      ? await sql`
          SELECT id, name, website_url, markdown, last_used_at, created_at, updated_at
          FROM brand_profiles WHERE user_id = ${userId}
          ORDER BY updated_at DESC`
      : await sql`
          SELECT id, name, website_url, markdown, last_used_at, created_at, updated_at
          FROM brand_profiles WHERE user_id IS NULL
          ORDER BY updated_at DESC`;
  } catch {
    return [];
  }
}

// The active site = the profile the user most recently used (cross-device).
// Falls back to the most-recently-updated profile before any has been "used".
export async function getActiveProfile(userId = null) {
  if (!sql) return null;
  try {
    const rows = userId
      ? await sql`
          SELECT id, name, website_url, markdown, last_used_at, created_at, updated_at
          FROM brand_profiles WHERE user_id = ${userId}
          ORDER BY last_used_at DESC NULLS LAST, updated_at DESC LIMIT 1`
      : await sql`
          SELECT id, name, website_url, markdown, last_used_at, created_at, updated_at
          FROM brand_profiles WHERE user_id IS NULL
          ORDER BY last_used_at DESC NULLS LAST, updated_at DESC LIMIT 1`;
    return rows[0] || null;
  } catch {
    return null;
  }
}

// Mark a profile as the active site (bumps last_used_at). Best-effort.
export async function touchProfile(id, userId = null) {
  if (!sql || !id) return false;
  try {
    const rows = userId
      ? await sql`
          UPDATE brand_profiles SET last_used_at = now()
          WHERE id = ${id} AND user_id = ${userId} RETURNING id`
      : await sql`
          UPDATE brand_profiles SET last_used_at = now()
          WHERE id = ${id} AND user_id IS NULL RETURNING id`;
    return rows.length > 0;
  } catch {
    return false;
  }
}

// Sites (of signed-in users) that have NOT had ideas generated yet today —
// drives the daily Ideas cron. Idempotent: re-running the same day returns
// nothing new. Only profiles with a website_url + a real user are eligible.
export async function dueIdeaSites(limit = 10) {
  if (!sql) return [];
  try {
    return await sql`
      SELECT p.id, p.user_id, p.name, p.website_url, p.markdown
      FROM brand_profiles p
      JOIN users u ON u.id = p.user_id
      WHERE p.website_url IS NOT NULL AND p.website_url <> ''
        AND NOT EXISTS (
          SELECT 1 FROM generated_content g
          WHERE g.profile_id = p.id AND g.kind = 'idea'
            AND g.created_at >= date_trunc('day', now())
        )
      ORDER BY p.last_used_at DESC NULLS LAST
      LIMIT ${limit}`;
  } catch {
    return [];
  }
}

export async function getProfile(id, userId = null) {
  if (!sql || !id) return null;
  try {
    const rows = userId
      ? await sql`
          SELECT id, name, website_url, markdown, last_used_at, created_at, updated_at
          FROM brand_profiles WHERE id = ${id} AND user_id = ${userId} LIMIT 1`
      : await sql`
          SELECT id, name, website_url, markdown, last_used_at, created_at, updated_at
          FROM brand_profiles WHERE id = ${id} AND user_id IS NULL LIMIT 1`;
    return rows[0] || null;
  } catch {
    return null;
  }
}

export async function createProfile(userId, { name, websiteUrl = null, markdown = "" }) {
  if (!sql) return null;
  try {
    const rows = await sql`
      INSERT INTO brand_profiles (user_id, name, website_url, markdown, last_used_at)
      VALUES (${userId}, ${name}, ${websiteUrl}, ${markdown}, now())
      RETURNING id, name, website_url, markdown, last_used_at, created_at, updated_at`;
    return rows[0] || null;
  } catch {
    return null;
  }
}

export async function updateProfile(id, userId, { name, websiteUrl = null, markdown = "" }) {
  if (!sql || !id) return null;
  try {
    const rows = userId
      ? await sql`
          UPDATE brand_profiles
          SET name = ${name}, website_url = ${websiteUrl}, markdown = ${markdown}, updated_at = now()
          WHERE id = ${id} AND user_id = ${userId}
          RETURNING id, name, website_url, markdown, last_used_at, created_at, updated_at`
      : await sql`
          UPDATE brand_profiles
          SET name = ${name}, website_url = ${websiteUrl}, markdown = ${markdown}, updated_at = now()
          WHERE id = ${id} AND user_id IS NULL
          RETURNING id, name, website_url, markdown, last_used_at, created_at, updated_at`;
    return rows[0] || null;
  } catch {
    return null;
  }
}

export async function deleteProfile(id, userId) {
  if (!sql || !id) return false;
  try {
    const rows = userId
      ? await sql`DELETE FROM brand_profiles WHERE id = ${id} AND user_id = ${userId} RETURNING id`
      : await sql`DELETE FROM brand_profiles WHERE id = ${id} AND user_id IS NULL RETURNING id`;
    return rows.length > 0;
  } catch {
    return false;
  }
}
