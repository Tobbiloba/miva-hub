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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { BookPlus, Clock, Loader2 } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";

type Group = {
  universityId: string;
  universityName: string;
  courseCode: string;
  courseTitle: string;
  students: number;
  firstRequestedAt: string;
};
type Department = {
  id: string;
  universityId: string;
  code: string;
  name: string;
};
type Data = { groups: Group[]; departments: Department[] };

const fetcher = async (url: string): Promise<Data> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Couldn't load the requests");
  return res.json();
};

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });

/**
 * Courses students' LMS has that Askly's catalog doesn't (raised by
 * automatic capture). Adding one puts it in the catalog; the students' next
 * daily sync enrolls them and captures it. Hidden when nothing is waiting.
 */
export function CourseRequestsPanel({ onAdded }: { onAdded?: () => void }) {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/admin/course-requests",
    fetcher,
  );

  if (!isLoading && !error && !data?.groups.length) return null;

  const multiUniversity =
    new Set(data?.groups.map((g) => g.universityId)).size > 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookPlus className="size-5" aria-hidden /> Courses students are
          waiting for
        </CardTitle>
        <CardDescription>
          Their LMS has these courses but Askly doesn&apos;t yet, so Askly
          Capture can&apos;t save their lessons. Add a course and their next
          daily sync captures it.
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
        ) : (
          <ul className="divide-y">
            {data!.groups.map((g) => (
              <RequestRow
                key={`${g.universityId}:${g.courseCode}`}
                group={g}
                showUniversity={multiUniversity}
                departments={data!.departments.filter(
                  (d) => d.universityId === g.universityId,
                )}
                onDone={(added) => {
                  mutate();
                  if (added) onAdded?.();
                }}
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
  showUniversity,
  departments,
  onDone,
}: {
  group: Group;
  showUniversity: boolean;
  departments: Department[];
  onDone: (added: boolean) => void;
}) {
  const { toast } = useToast();
  const [departmentId, setDepartmentId] = useState("");
  const [saving, setSaving] = useState<"add" | "dismiss" | null>(null);

  const act = async (action: "add" | "dismiss") => {
    setSaving(action);
    try {
      const res = await fetch("/api/admin/course-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          universityId: group.universityId,
          courseCode: group.courseCode,
          ...(action === "add"
            ? { title: group.courseTitle, departmentId }
            : {}),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Something went wrong");
      toast(
        action === "add"
          ? {
              title: `${group.courseCode} ${body.created ? "added" : "linked"}`,
              description: `${body.students} student${body.students === 1 ? "" : "s"} will have it captured on their next sync.`,
            }
          : { title: `Dismissed ${group.courseCode}` },
      );
      onDone(action === "add");
    } catch (e) {
      toast({
        title:
          action === "add"
            ? `Couldn't add ${group.courseCode}`
            : "Couldn't dismiss it",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  return (
    <li className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="font-medium">
          {group.courseCode}{" "}
          <span className="font-normal text-muted-foreground">
            {group.courseTitle}
          </span>
        </p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {showUniversity && <span>{group.universityName}</span>}
          <Badge variant="secondary">
            {group.students} student{group.students === 1 ? "" : "s"}
          </Badge>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden /> since{" "}
            {shortDate(group.firstRequestedAt)}
          </span>
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select value={departmentId} onValueChange={setDepartmentId}>
          <SelectTrigger
            className="min-h-11 sm:w-60"
            aria-label={`Department for ${group.courseCode}`}
          >
            <SelectValue
              placeholder={
                departments.length ? "Choose a department" : "No departments"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          className="min-h-11"
          disabled={!departmentId || !!saving}
          onClick={() => act("add")}
        >
          {saving === "add" && <Loader2 className="mr-2 size-4 animate-spin" />}
          Add course
        </Button>
        <Button
          variant="ghost"
          className="min-h-11"
          disabled={!!saving}
          onClick={() => act("dismiss")}
        >
          {saving === "dismiss" && (
            <Loader2 className="mr-2 size-4 animate-spin" />
          )}
          Dismiss
        </Button>
      </div>
    </li>
  );
}
