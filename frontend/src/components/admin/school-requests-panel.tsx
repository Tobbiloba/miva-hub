"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Clock, Link2, Loader2, Users } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";

type Group = {
  emailDomain: string;
  schoolNames: string[];
  students: number;
  firstAt: string;
  lastAt: string;
  suggested: { id: string; name: string } | null;
};
type Uni = { id: string; name: string; emailDomains: string[] };
type Data = { groups: Group[]; universities: Uni[] };

const fetcher = async (url: string): Promise<Data> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Couldn't load the requests");
  return res.json();
};

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });

/**
 * Super admin: students who signed up while their school wasn't on Askly,
 * grouped by email domain (most-requested first), with a way to link each
 * group to a university.
 */
export function SchoolRequestsPanel() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/super-admin/school-requests",
    fetcher,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="size-5" aria-hidden /> Students waiting for their
          school
        </CardTitle>
        <CardDescription>
          Students who signed up with a school email we don&apos;t support yet,
          most-requested first. Linking a school attaches them to it and emails
          them.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading requests…
          </div>
        ) : error ? (
          <div className="flex flex-wrap items-center gap-3 py-6 text-sm">
            <span className="text-destructive">
              Couldn&apos;t load the requests.
            </span>
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => mutate()}
            >
              Try again
            </Button>
          </div>
        ) : !data || data.groups.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            No students are waiting for their school.
          </p>
        ) : (
          <ul className="divide-y">
            {data.groups.map((g) => (
              <RequestRow
                key={g.emailDomain}
                group={g}
                universities={data.universities}
                onLinked={() => mutate()}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function RequestRow({
  group,
  universities,
  onLinked,
}: {
  group: Group;
  universities: Uni[];
  onLinked: () => void;
}) {
  const { toast } = useToast();
  const [universityId, setUniversityId] = useState(group.suggested?.id ?? "");
  const [addDomain, setAddDomain] = useState(!group.suggested);
  const [saving, setSaving] = useState(false);
  const checkboxId = `add-domain-${group.emailDomain}`;

  const link = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/super-admin/school-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailDomain: group.emailDomain,
          universityId,
          addDomain,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Couldn't link the students");
      toast({
        title: `Linked ${body.linked} student${body.linked === 1 ? "" : "s"}`,
        description: "They've been emailed that their school is on Askly.",
      });
      onLinked();
    } catch (e) {
      toast({
        title: "Couldn't link the students",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="font-medium">
          {group.schoolNames[0]}
          {group.schoolNames.length > 1 && (
            <span className="font-normal text-muted-foreground">
              {" "}
              (also “{group.schoolNames.slice(1, 3).join("”, “")}”)
            </span>
          )}
        </p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="font-mono">@{group.emailDomain}</span>
          <Badge variant="secondary">
            {group.students} student{group.students === 1 ? "" : "s"}
          </Badge>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden />
            {shortDate(group.firstAt)}
            {group.firstAt.slice(0, 10) !== group.lastAt.slice(0, 10) &&
              ` – ${shortDate(group.lastAt)}`}
          </span>
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select value={universityId} onValueChange={setUniversityId}>
          <SelectTrigger
            className="min-h-11 sm:w-64"
            aria-label={`University for @${group.emailDomain}`}
          >
            <SelectValue placeholder="Choose a university" />
          </SelectTrigger>
          <SelectContent>
            {universities.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label
          htmlFor={checkboxId}
          className="flex min-h-11 items-center gap-2 text-sm"
        >
          <Checkbox
            id={checkboxId}
            checked={addDomain}
            onCheckedChange={(c) => setAddDomain(c === true)}
          />
          New @{group.emailDomain} students join directly
        </label>
        <Button
          className="min-h-11"
          disabled={!universityId || saving}
          onClick={link}
        >
          {saving ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Link2 className="mr-2 size-4" />
          )}
          Link {group.students}
        </Button>
      </div>
    </li>
  );
}
