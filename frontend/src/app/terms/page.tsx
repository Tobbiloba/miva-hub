import fs from "fs";
import path from "path";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata = {
  title: "Terms of Service — Askly",
};

export default function TermsPage() {
  const content = fs.readFileSync(
    path.join(process.cwd(), "content/legal/terms.md"),
    "utf-8",
  );

  return <LegalPage content={content} />;
}
