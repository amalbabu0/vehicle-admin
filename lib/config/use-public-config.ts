"use client";

import { useQuery } from "@tanstack/react-query";
import type { PublicConfig } from "@/lib/config/public-config";

async function fetchPublicConfig(): Promise<PublicConfig> {
  const res = await fetch("/api/public-config");
  if (!res.ok) {
    throw new Error(`Failed to load public config: ${res.status}`);
  }
  return res.json();
}

/**
 * Runtime replacement for reading NEXT_PUBLIC_* env vars directly in client
 * components. Backed by TanStack Query, so every caller across the app
 * shares one request/cache instead of each component fetching separately.
 */
export function usePublicConfig() {
  return useQuery({
    queryKey: ["public-config"],
    queryFn: fetchPublicConfig,
    staleTime: Infinity, // only changes on redeploy, no need to refetch
    gcTime: Infinity,
  });
}
