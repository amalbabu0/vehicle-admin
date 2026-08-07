"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Download, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FUEL_TYPES, TRANSMISSIONS } from "@/lib/validators/vehicle";

const ANY = "any";

export function ListingsFilters({
  brands,
  categories,
  districts,
  listers,
}: {
  brands: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  districts: { slug: string; name: string }[];
  listers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === ANY) params.delete(key);
    else params.set(key, value);
    params.delete("page");
    router.push(`/admin/listings?${params.toString()}`);
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (search !== (searchParams.get("search") ?? "")) set("search", search);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const activeCount = [...searchParams.keys()].filter((key) => !["page", "tab"].includes(key)).length;

  const exportHref = `/api/admin/listings/export?${searchParams.toString()}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search listings…" className="pl-9" />
        </div>
        {activeCount > 0 ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => router.push("/admin/listings")} className="gap-1">
            <X className="size-3.5" /> Clear filters
          </Button>
        ) : null}
        <a href={exportHref} className="no-underline sm:ml-auto">
          <Button type="button" variant="outline" className="w-full gap-2 sm:w-auto">
            <Download className="size-4" /> Export
          </Button>
        </a>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Select value={searchParams.get("brandId") ?? ANY} onValueChange={(value) => set("brandId", value)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Brand" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any brand</SelectItem>
            {brands.map((brand) => <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={searchParams.get("categoryId") ?? ANY} onValueChange={(value) => set("categoryId", value)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any category</SelectItem>
            {categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={searchParams.get("fuelType") ?? ANY} onValueChange={(value) => set("fuelType", value)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Fuel type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any fuel</SelectItem>
            {FUEL_TYPES.map((fuel) => <SelectItem key={fuel} value={fuel}>{fuel}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={searchParams.get("transmission") ?? ANY} onValueChange={(value) => set("transmission", value)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Transmission" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any transmission</SelectItem>
            {TRANSMISSIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={searchParams.get("districtSlug") ?? ANY} onValueChange={(value) => set("districtSlug", value)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="District" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any district</SelectItem>
            {districts.map((district) => <SelectItem key={district.slug} value={district.slug}>{district.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={searchParams.get("listerId") ?? ANY} onValueChange={(value) => set("listerId", value)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Lister" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any lister</SelectItem>
            {listers.map((lister) => <SelectItem key={lister.id} value={lister.id}>{lister.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
