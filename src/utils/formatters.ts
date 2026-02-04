import { useList } from "./useList";

export function formatNameListWithLimit(
    items: any[] | undefined,
    options?: {
      key?: string;        // property to read (name, clientName, etc.)
      limit?: number;      // how many to show
      empty?: string;      // fallback text
    }
  ) {
    const {
      key = "name",
      limit = 3,
      empty = "—",
    } = options || {};
  
    if (!items || !items.length) return empty;
  
    const names = items.map(item =>
      typeof item === "string"
        ? item
        : item?.[key] ?? empty
    );
  
    const visible = names.slice(0, limit);
    const remaining = names.length - visible.length;
  
    return remaining > 0
      ? `${visible.join(", ")} +${remaining} more`
      : visible.join(", ");
  }