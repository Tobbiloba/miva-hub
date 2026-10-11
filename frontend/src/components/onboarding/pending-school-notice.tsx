import { Clock } from "lucide-react";

/**
 * Shown on the empty chat while the student's school isn't on Askly yet:
 * what works now, and what unlocks once their school is added.
 */
export function PendingSchoolNotice({ schoolName }: { schoolName: string }) {
  return (
    <div
      role="status"
      className="mx-auto flex w-full max-w-3xl items-start gap-3 rounded-xl border bg-card px-4 py-3.5 text-sm"
    >
      <Clock
        className="mt-0.5 size-5 shrink-0 text-muted-foreground"
        aria-hidden
      />
      <div className="space-y-1">
        <p className="font-medium">We&apos;re adding {schoolName} to Askly</p>
        <p className="text-muted-foreground">
          You can already ask anything, snap a photo of a question, make
          flashcards and track your deadlines. We&apos;ll email you when{" "}
          {schoolName} is added, and then Askly can answer from your own course
          materials.
        </p>
      </div>
    </div>
  );
}
