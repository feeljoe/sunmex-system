import { useMemo } from "react";

type FilterFn<T> = (item: T, query: string) => boolean;

export function useFilteredList<T>(
  items: T[],
  query: string,
  filterFn: FilterFn<T>
) {
  return useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter((item) => filterFn(item, q));
  }, [items, query, filterFn]);
}
