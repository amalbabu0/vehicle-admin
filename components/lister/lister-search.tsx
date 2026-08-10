"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Car } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandDialog } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import type { ListerSearchResult } from "@/app/api/lister/search/route";

export function ListerSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ListerSearchResult[]>([]);
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
      fetch(`/api/lister/search?q=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((payload) => setResults(payload.results ?? []))
        .catch(() => setResults([]))
        .finally(() => setIsLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const visibleResults = query.trim() ? results : [];

  const select = (result: ListerSearchResult) => {
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
        className="hidden min-h-11 w-56 justify-between text-muted-foreground sm:flex"
      >
        <span className="inline-flex items-center gap-2">
          <Search className="size-4" /> Search…
        </span>
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium">Ctrl K</kbd>
      </Button>
      <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(true)} className="size-11 rounded-full bg-muted sm:hidden" aria-label="Search">
        <Search className="size-5" />
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen} title="Search my vehicles" description="Search your own listings">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search your vehicles…" value={query} onValueChange={setQuery} />
          <CommandList>
            {!isLoading && query.trim() && visibleResults.length === 0 ? <CommandEmpty>No results found.</CommandEmpty> : null}
            <CommandGroup heading="Your vehicles">
              {visibleResults.map((result) => (
                <CommandItem key={result.id} value={result.id} onSelect={() => select(result)}>
                  <Car className="size-4" />
                  <div className="flex flex-col">
                    <span>{result.title}</span>
                    <span className="text-xs capitalize text-muted-foreground">{result.subtitle}</span>
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
