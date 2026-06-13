"use client";

// Triggers the browser's print dialog (Save as PDF). Hidden in the printed
// output via the [data-print-hide] print rule in globals.css.

import { Button } from "@/components/ui/button";

export default function PrintButton() {
  return (
    <Button data-print-hide onClick={() => window.print()}>
      Download PDF
    </Button>
  );
}
