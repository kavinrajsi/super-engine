"use client";

// PostHog product analytics. No-ops cleanly when the token isn't set.

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";

const KEY = process.env.NEXT_PUBLIC_superengine_POSTHOG_PROJECT_TOKEN;
const HOST = process.env.NEXT_PUBLIC_superengine_POSTHOG_HOST || "https://us.i.posthog.com";

let initialized = false;

function PageView() {
  const pathname = usePathname();
  useEffect(() => {
    if (KEY) posthog.capture("$pageview", { $current_url: window.location.href });
  }, [pathname]);
  return null;
}

export function PostHogProvider({ children }) {
  useEffect(() => {
    if (!KEY || initialized) return;
    initialized = true;
    posthog.init(KEY, {
      api_host: HOST,
      capture_pageview: false, // we capture manually on navigation
      capture_pageleave: true,
    });
  }, []);

  if (!KEY) return children;
  return (
    <PHProvider client={posthog}>
      <PageView />
      {children}
    </PHProvider>
  );
}
