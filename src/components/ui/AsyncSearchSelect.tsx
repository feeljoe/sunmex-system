"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  value: any;
  onChange: (item: any) => void;
  endpoint: string;
  placeholder: string;
  displayValue?: string;
}

export default function AsyncSearchSelect({
  value,
  onChange,
  endpoint,
  placeholder,
  displayValue,
}: Props) {
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<any[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const abortRef = useRef<AbortController | null> (null);

  useEffect(() => {
    if (!isDirty && displayValue) {
        setInputValue(displayValue);
    }
  }, [displayValue, isDirty]);

  useEffect(() => {
    if(!isDirty || inputValue.trim().length < 2) {
        setOptions([]);
        return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const fetchOptions = async () => {
        setLoading(true);
        try{
            const res = await fetch(
                `${endpoint}?search=${encodeURIComponent(inputValue)}&limit=25`,
                { signal: controller.signal }
            );
            const json = await res.json();
            setOptions(json.items || []);
        } catch(err:any){
            if(err.name !== "AbortError") {
                console.error(err);
            }
        }finally {
            setLoading(false);
        }
    };
    fetchOptions();
  }, [inputValue, endpoint, isDirty]);

  return (
    <div className="relative">
      <input
        value={inputValue}
        onChange={e => {
            setInputValue(e.target.value);
            setIsDirty(true);
        }}
        placeholder={placeholder}
        className="p-2 rounded-xl bg-white shadow-xl w-full"
      />
      {loading &&(
        <div className="absolute right-3 top-3 text-xs text-gray-400">
            loading…
        </div>
      )}

      {options.length > 0 && (
        <div className="absolute z-20 bg-white shadow-xl rounded-xl mt-1 w-full max-h-48 overflow-y-auto">
          {options.map(opt => (
            <div
              key={opt._id}
              onClick={() => {
                onChange(opt);
                setInputValue(opt.name);
                setOptions([]);
                setIsDirty(false);
              }}
              className="p-2 hover:bg-gray-100 cursor-pointer"
            >
              {opt.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
