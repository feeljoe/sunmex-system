"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  value?: any; // Made optional so it works as a standalone search bar
  onChange: (item: any) => void;
  endpoint: string;
  placeholder: string;
  displayValue?: string;
  getOptionLabel?: (opt: any) => string;
  clearOnSelect?: boolean;
  filterOption?: (opt: any) => boolean;
}

export default function AsyncSearchSelect({
  value,
  onChange,
  endpoint,
  placeholder,
  displayValue,
  getOptionLabel,
  clearOnSelect = false,
  filterOption,
}: Props) {
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<any[]>([]);
  const [userEditing, setUserEditing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (value && !clearOnSelect) {
      setInputValue(displayValue || "");
      setUserEditing(false);
    }
  }, [value, displayValue, clearOnSelect]);

  useEffect(() => {
    if (!userEditing || inputValue.trim().length < 2) {
      setOptions([]);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const fetchOptions = async () => {
      setLoading(true);
      try {
        const url = new URL(endpoint, window.location.origin);
        url.searchParams.set("search", inputValue);
        url.searchParams.set("limit", "25");

        const res = await fetch(url.toString(), { signal: controller.signal });
        const json = await res.json();
        
        let fetchedOptions = json.items || json.products || json.clients || [];
        
        if (filterOption) {
            fetchedOptions = fetchedOptions.filter(filterOption);
        }
        
        setOptions(fetchedOptions);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error(err);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchOptions();
  }, [inputValue, endpoint, userEditing]);

  return (
    <div className="relative w-full">
      <input
        value={inputValue}
        onChange={e => {
          setInputValue(e.target.value);
          setUserEditing(true);
        }}
        placeholder={placeholder}
        className="p-2 rounded-xl bg-white shadow-xl w-full outline-none font-medium"
      />
      {loading && (
        <div className="absolute right-3 top-3 text-xs font-bold text-blue-500 animate-pulse">
          Loading...
        </div>
      )}

      {options.length > 0 && (
        <div className="absolute z-50 bg-white shadow-2xl border border-gray-100 rounded-xl mt-1 w-full max-h-48 overflow-y-auto">
          {options.map(opt => {
            const label = getOptionLabel ? getOptionLabel(opt) : opt.name;
            return (
              <div
                key={opt._id}
                onClick={() => {
                  onChange(opt);
                  if (clearOnSelect) {
                    setInputValue("");
                  } else {
                    setInputValue(label);
                  }
                  setOptions([]);
                  setUserEditing(false);
                }}
                className="p-2 capitalize hover:bg-blue-50 cursor-pointer font-medium capitalize border-b border-gray-100 last:border-b-0 text-sm md:text-[16px] text-left"
              >
                {label?.toLowerCase()} {opt.sku && <span className="text-gray-500 text-xs ml-1">(SKU: {opt.sku})</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}