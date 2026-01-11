"use client";
import { useEffect, useState } from 'react';
interface UseListOptions {
  page?: number;
  limit?: number;
  search?:string;
  [key: string]: any;
}

export function useList<T = any>(
  baseUrl: string, 
  options: UseListOptions = {}
) {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [meta, setMeta] = useState<any>({});


  const fetchData = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if(options.page) params.set("page", String(options.page));
    if(options.limit) params.set("limit", String(options.limit));
    if(options.search) params.set("search", options.search);
    for (const key in options) {
      if (options[key]) params.append(key, options[key]);
    }
    try{
      const res = await fetch(`${baseUrl}?${params.toString()}`);
      const data = await res.json();
      setItems(Array.isArray(data.items)? data.items: []);
      setTotal(typeof data.total === "number"? data.total : 0);

      const { items, total, ...rest } = data;
      setMeta(rest);

    } catch(err){
      console.error("Use List error:", err);
      setItems([]);
      setTotal(0);
      setMeta({});
    }finally{
      setLoading(false);
    }
    
  };

  useEffect(() => { 
    fetchData(); 
  }, [JSON.stringify(options), baseUrl]);

  return { 
    items, 
    total, 
    meta,
    loading,
    reload: fetchData 
  };
}