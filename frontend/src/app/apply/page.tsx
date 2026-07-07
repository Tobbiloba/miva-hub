import { AdmissionApplication } from "@/components/admissions/admission-application";

export const metadata = {
  title: "Apply — Askly",
  description:
    "Apply to a university on Askly. Our AI admissions officer verifies your credentials and gives you a decision in minutes.",
};

export default function ApplyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Apply for admission</h1>
        <p className="text-muted-foreground">
          Submit your results once — our AI admissions officer verifies them,
          decides, and sets up your student account on the spot.
        </p>
      </div>
      <AdmissionApplication />
    </div>
  );
}
