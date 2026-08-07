"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Car, User } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandDialog } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import type { AdminSearchResult } from "@/app/api/admin/search/route";

export function AdminSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, []);

  useEffect(() => {
    if (!query.trim()) return;
    const timeout = setTimeout(() => {
      setIsLoading(true);
      fetch(`/api/admin/search?q=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((payload) => setResults(payload.results ?? []))
        .catch(() => setResults([]))
        .finally(() => setIsLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  // Derived, not synced via effect: an empty query always shows no results,
  // regardless of whatever `results` still holds from a previous query.
  const visibleResults = query.trim() ? results : [];

  const select = (result: AdminSearchResult) => {
    setOpen(false);
    setQuery("");
    router.push(result.href);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="hidden w-64 justify-between text-muted-foreground sm:flex"
      >
        <span className="inline-flex items-center gap-2">
          <Search className="size-4" /> Search…
        </span>
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium">Ctrl K</kbd>
      </Button>
      <Button type="button" variant="outline" size="icon" onClick={() => setOpen(true)} className="sm:hidden" aria-label="Search">
        <Search className="size-4" />
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen} title="Admin search" description="Search vehicles and users">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search vehicles, users…" value={query} onValueChange={setQuery} />
          <CommandList>
            {!isLoading && query.trim() && visibleResults.length === 0 ? <CommandEmpty>No results found.</CommandEmpty> : null}
            <CommandGroup heading="Results">
              {visibleResults.map((result) => (
                <CommandItem key={`${result.type}-${result.id}`} value={`${result.type}-${result.id}`} onSelect={() => select(result)}>
                  {result.type === "vehicle" ? <Car className="size-4" /> : <User className="size-4" />}
                  <div className="flex flex-col">
                    <span>{result.title}</span>
                    <span className="text-xs text-muted-foreground">{result.subtitle}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
