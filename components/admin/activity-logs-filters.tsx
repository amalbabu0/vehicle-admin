"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { KNOWN_ACTIONS, KNOWN_ENTITY_TYPES, type ActorOption } from "@/lib/admin/activity-log-constants";

export function ActivityLogsFilters({ actors }: { actors: ActorOption[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") params.delete(key);
    else params.set(key, value);
    params.delete("page");
    router.push(`/admin/activity-logs?${params.toString()}`);
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (search !== (searchParams.get("search") ?? "")) setParam("search", search);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const exportHref = (() => {
    const params = new URLSearchParams();
    for (const key of ["search", "action", "entityType", "actorId", "from", "to"]) {
      if (searchParams.get(key)) params.set(key, searchParams.get(key)!);
    }
    return `/api/admin/activity-logs/export?${params.toString()}`;
  })();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search action, entity, actor…" className="pl-9" />
        </div>

        <Select value={searchParams.get("action") ?? "all"} onValueChange={(value) => setParam("action", value)}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Action" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {KNOWN_ACTIONS.map((action) => (
              <SelectItem key={action} value={action} className="capitalize">
                {action.replaceAll("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={searchParams.get("entityType") ?? "all"} onValueChange={(value) => setParam("entityType", value)}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Entity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entities</SelectItem>
            {KNOWN_ENTITY_TYPES.map((type) => (
              <SelectItem key={type} value={type} className="capitalize">
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={searchParams.get("actorId") ?? "all"} onValueChange={(value) => setParam("actorId", value)}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Admin" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All admins</SelectItem>
            {actors.map((actor) => (
              <SelectItem key={actor.id} value={actor.id}>
                {actor.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <a href={exportHref} className="no-underline sm:ml-auto">
          <Button type="button" variant="outline" className="w-full gap-2 sm:w-auto">
            <Download className="size-4" /> Export
          </Button>
        </a>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          From
          <Input
            type="date"
            className="w-auto"
            value={searchParams.get("from")?.slice(0, 10) ?? ""}
            onChange={(event) => setParam("from", event.target.value ? new Date(event.target.value).toISOString() : "")}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          To
          <Input
            type="date"
            className="w-auto"
            value={searchParams.get("to")?.slice(0, 10) ?? ""}
            onChange={(event) => setParam("to", event.target.value ? new Date(`${event.target.value}T23:59:59`).toISOString() : "")}
          />
        </label>
      </div>
    </div>
  );
}
