import fs from "fs";
import path from "path";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata = {
  title: "Privacy Policy — Askly",
};

export default function PrivacyPage() {
  const content = fs.readFileSync(
    path.join(process.cwd(), "content/legal/privacy.md"),
    "utf-8",
  );

  return <LegalPage content={content} />;
}
