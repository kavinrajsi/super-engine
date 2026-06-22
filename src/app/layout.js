import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { PostHogProvider } from "@/components/posthog-provider";
import { ActiveSiteProvider } from "@/components/active-site-provider";
import { getActiveSite } from "@/lib/site/active";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display face for the marketing surface — a technical grotesque that reads as
// "precision instrument", set against Geist body + Geist Mono labels.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata = {
  title: "MadRank — SEO Audit",
  description:
    "Enter a URL to audit its sitemap and on-page SEO, social, and AI-search signals.",
};

export default async function RootLayout({ children }) {
  const activeSite = await getActiveSite();
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable}`}
    >
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ActiveSiteProvider value={activeSite}>
            <PostHogProvider>{children}</PostHogProvider>
          </ActiveSiteProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
