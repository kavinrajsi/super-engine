import Link from "next/link";
import ThemeToggle from "@/components/theme-toggle";

export default function ToolsLayout({ children }) {
  return (
    <div className="min-h-screen">
      <header className="flex h-14 items-center justify-between border-b px-6">
        <Link href="/" className="font-bold tracking-tight no-underline">
          🔎 Meta Tag
        </Link>
        <ThemeToggle />
      </header>
      <div className="mx-auto max-w-4xl p-6">{children}</div>
    </div>
  );
}
