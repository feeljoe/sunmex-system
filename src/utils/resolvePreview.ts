export function resolvePreviewItems<T extends { _id: string }>(
    ids: string[] | undefined,
    options: T[]
  ): T[] {
    if (!ids?.length) return [];
  
    return ids
      .map(id => options.find(o => o._id === id))
      .filter(Boolean) as T[];
  }
  