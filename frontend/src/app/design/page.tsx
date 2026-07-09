import type { Metadata } from "next";
import { ControlsSection } from "./_components/controls-section";
import { DesignShell } from "./_components/design-shell";
import { FoundationsSection } from "./_components/foundations-section";
import { MotionSection } from "./_components/motion-section";
import { SurfacesSection } from "./_components/surfaces-section";

export const metadata: Metadata = {
  title: "Design System",
  description:
    "The complete design system: color tokens, typography, spacing, and every UI component in every variant and state.",
};

export default function DesignSystemPage() {
  return (
    <DesignShell>
      <FoundationsSection />
      <ControlsSection />
      <SurfacesSection />
      <MotionSection />
    </DesignShell>
  );
}
