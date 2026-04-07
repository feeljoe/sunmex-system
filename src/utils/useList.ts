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
    
    for (const key in options) {
      if (options[key] !== undefined && options[key] !== null) {
        params.set(key, String(options[key]));
      }
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