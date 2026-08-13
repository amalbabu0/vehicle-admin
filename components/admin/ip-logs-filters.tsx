"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function IpLogsFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value) params.delete(key);
    else params.set(key, value);
    params.delete("page");
    router.push(`/admin/ip-logs?${params.toString()}`);
  };

  // 400ms to match the debounce already used on the activity-logs and
  // listings filters, so typing here feels the same as everywhere else.
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

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
      <div className="relative flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search IP or page…"
          className="pl-9"
        />
      </div>

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
  );
}
