// Search Console moved into the combined /seo dashboard (Analytics + Search
// Console). Keep this route as a permanent redirect so old links/bookmarks land
// in the right place.

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function SearchConsolePage() {
  redirect("/seo");
}
