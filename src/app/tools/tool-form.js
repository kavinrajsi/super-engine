import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Plain GET form: enter a URL -> the tool route generates from a fresh scan.
export default function ToolForm({ action, defaultValue = "" }) {
  return (
    <form action={action} method="get" className="flex max-w-xl flex-col gap-2 sm:flex-row">
      <Input
        type="text"
        inputMode="url"
        name="url"
        defaultValue={defaultValue}
        placeholder="example.com"
        required
        autoComplete="url"
        aria-label="Website URL"
        className="h-11 flex-1 text-base"
      />
      <Button type="submit" size="lg" className="h-11 px-6 text-base">
        Generate
      </Button>
    </form>
  );
}
