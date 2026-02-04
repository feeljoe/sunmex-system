import { useMemo } from "react";
import { useList } from "@/utils/useList";

type LookupMap = Record<string, string>;

export function useLookupMap(
  endpoint: string,
  options?: Record<string, any>
) {
  const { items, loading } = useList(endpoint, {
    limit: 1000,
    ...options,
  });

  const map = useMemo<LookupMap>(() => {
    const m: LookupMap = {};
    items.forEach((item: any) => {
      if (item?._id) {
        m[item._id] = item.name;
      }
    });
    return m;
  }, [items]);

  return {
    map,
    loading,
  };
}
