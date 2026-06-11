"use client";

// Social-share preview: shows how the page unfurls when shared (og:image +
// domain + title + description). Falls back gracefully when the image is
// missing or blocked.

import { useState } from "react";
import { ImageOff } from "lucide-react";

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function OgPreview({ og = {}, title, description, url }) {
  const [broken, setBroken] = useState(false);
  const img = og.image;
  const showImg = img && !broken;

  return (
    <div className="w-full max-w-md overflow-hidden rounded-lg border bg-card">
      <div className="flex aspect-[1200/630] items-center justify-center bg-muted">
        {showImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            className="size-full object-cover"
            onError={() => setBroken(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <ImageOff className="size-6" />
            <span className="text-xs">No OG image</span>
          </div>
        )}
      </div>
      <div className="space-y-1 p-3">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{hostOf(url)}</div>
        <div className="line-clamp-2 text-sm font-semibold">
          {og.title || title || <span className="text-muted-foreground">No title</span>}
        </div>
        {(og.description || description) && (
          <div className="line-clamp-2 text-xs text-muted-foreground">
            {og.description || description}
          </div>
        )}
      </div>
    </div>
  );
}
