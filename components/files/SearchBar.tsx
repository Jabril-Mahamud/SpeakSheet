'use client';

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Search } from 'lucide-react';
import { useEffect } from "react";
import { useDebouncedCallback } from 'use-debounce';

export default function SearchForm({ defaultValue = "" }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSearch = useDebouncedCallback((value: string) => {
    const params = new URLSearchParams();
    searchParams.forEach((val, key) => {
      params.set(key, val);
    });
    
    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }
    
    router.push(`/files?${params.toString()}`);
  }, 300);

  return (
    <div className="flex gap-2">
      <Input
        type="search"
        placeholder="Search files..."
        defaultValue={defaultValue}
        onChange={(e) => handleSearch(e.target.value)}
        className="max-w-sm text-lg"
      />
      <Search className="h-5 w-5 my-auto text-gray-500" />
    </div>
  );
}