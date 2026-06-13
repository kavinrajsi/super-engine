// Confirmed Google ranking updates (core + spam, plus the Feb 2026 Discover
// core update), newest first.
//
// Source of truth: Google Search Status Dashboard.
//   https://status.search.google.com/products/rGHU1u87FJnkP6W2GwMi/history
// Static by design (the dashboard is a JS app that's fragile to scrape). When
// Google ships a new ranking update, prepend one entry and bump DATA_AS_OF.

export const SOURCE_URL =
  "https://status.search.google.com/products/rGHU1u87FJnkP6W2GwMi/history";
export const DATA_AS_OF = "June 2026";

// type: "core" | "spam". `end` is start + the dashboard's reported duration.
// `summary` is a plain-language note: categorical for routine core/spam updates,
// with specifics only where well-documented.
export const GOOGLE_UPDATES = [
  {
    name: "May 2026 Core Update",
    type: "core",
    start: "2026-05-21",
    end: "2026-06-02",
    duration: "11d 21h",
    status: "Completed",
    summary:
      "Broad core update — the most recent sitewide reassessment of how Google rewards helpful, reliable content. Expect relative ranking shifts rather than penalties.",
  },
  {
    name: "March 2026 Core Update",
    type: "core",
    start: "2026-03-27",
    end: "2026-04-08",
    duration: "12d 4h",
    status: "Completed",
    summary: "Broad core update — a routine reassessment of overall content quality and relevance across Search.",
  },
  {
    name: "March 2026 Spam Update",
    type: "spam",
    start: "2026-03-24",
    end: "2026-03-25",
    duration: "19h 30m",
    status: "Completed",
    summary: "Short spam update enforcing Google's spam policies via automated systems (SpamBrain) — a quick, sub-day rollout.",
  },
  {
    name: "February 2026 Discover Core Update",
    type: "core",
    start: "2026-02-05",
    end: "2026-02-27",
    duration: "21d 17h",
    status: "Completed",
    summary:
      "Google's first core update labeled specifically for Discover (not traditional Search rankings) — a broad recalibration of how the Discover feed selects content. Rolled out first to US-English with a stronger weighting toward sites in the user's own country, expanding to more regions and languages after.",
  },
  {
    name: "December 2025 Core Update",
    type: "core",
    start: "2025-12-11",
    end: "2025-12-29",
    duration: "18d 2h",
    status: "Completed",
    summary: "Broad core update closing out 2025 — a sitewide quality and relevance reassessment.",
  },
  {
    name: "August 2025 Spam Update",
    type: "spam",
    start: "2025-08-26",
    end: "2025-09-22",
    duration: "26d 15h",
    status: "Completed",
    summary: "Extended spam update (~26 days) enforcing Google's spam policies — one of the longer spam rollouts on record.",
  },
  {
    name: "June 2025 Core Update",
    type: "core",
    start: "2025-06-30",
    end: "2025-07-17",
    duration: "16d 18h",
    status: "Completed",
    summary: "Broad core update — a mid-year reassessment of content quality and relevance.",
  },
  {
    name: "March 2025 Core Update",
    type: "core",
    start: "2025-03-13",
    end: "2025-03-27",
    duration: "13d 21h",
    status: "Completed",
    summary: "Broad core update — a routine sitewide quality and relevance reassessment.",
  },
  {
    name: "December 2024 Spam Update",
    type: "spam",
    start: "2024-12-19",
    end: "2024-12-26",
    duration: "7d 2h",
    status: "Completed",
    summary: "Year-end spam update enforcing Google's spam policies — rolled out just days after the December core update.",
  },
  {
    name: "December 2024 Core Update",
    type: "core",
    start: "2024-12-12",
    end: "2024-12-18",
    duration: "6d 4h",
    status: "Completed",
    summary: "A fast core update landing only weeks after November's — an unusually close back-to-back pair of core updates.",
  },
  {
    name: "November 2024 Core Update",
    type: "core",
    start: "2024-11-11",
    end: "2024-12-05",
    duration: "23d 13h",
    status: "Completed",
    summary: "Broad core update with a long (~24-day) rollout — a sitewide reassessment of helpful, reliable content.",
  },
  {
    name: "August 2024 Core Update",
    type: "core",
    start: "2024-08-15",
    end: "2024-09-03",
    duration: "19d 4h",
    status: "Completed",
    summary:
      "Core update Google said aimed to better surface genuinely helpful content and account for sites hit by the 2023 Helpful Content Update; some sites reported recovery.",
  },
  {
    name: "June 2024 Spam Update",
    type: "spam",
    start: "2024-06-20",
    end: "2024-06-27",
    duration: "7d 1h",
    status: "Completed",
    summary: "Spam update enforcing Google's spam policies (e.g. cloaking, scaled/auto-generated abuse, link spam) via SpamBrain.",
  },
  {
    name: "March 2024 Spam Update",
    type: "spam",
    start: "2024-03-05",
    end: "2024-03-20",
    duration: "14d 21h",
    status: "Completed",
    summary:
      "Launched alongside the March core update with new policies targeting scaled content abuse, expired-domain abuse, and site reputation abuse ('parasite SEO').",
  },
  {
    name: "March 2024 Core Update",
    type: "core",
    start: "2024-03-05",
    end: "2024-04-19",
    duration: "45d",
    status: "Completed",
    summary:
      "Google's most complex core update — a 45-day rollout that folded the Helpful Content system into core ranking, aiming to cut unhelpful, unoriginal content by ~40%.",
  },
];
