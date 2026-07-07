import { AdmissionsQueue } from "@/components/admin/admissions-queue";

export default function AdminAdmissionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admissions</h1>
        <p className="text-muted-foreground mt-1">
          The AI admissions officer decides most applications on its own — you
          only see the ones it escalated.
        </p>
      </div>
      <AdmissionsQueue />
    </div>
  );
}
