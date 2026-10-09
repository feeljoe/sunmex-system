"use client";

import { useCallback, useEffect, useState } from "react";

export type CompanySettings = {
  _id?: string;
  companyName: string;
  address: {
    street: string;
    street2: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  phone: string;
  email: string;
  website: string;
};

export const defaultCompanySettings: CompanySettings = {
  companyName: "",
  address: {
    street: "",
    street2: "",
    city: "",
    state: "",
    zipCode: "",
    country: "USA",
  },
  phone: "",
  email: "",
  website: "",
};

export function useCompanySettings() {
  const [settings, setSettings] = useState<CompanySettings>(
    defaultCompanySettings
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/company-settings", {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Could not load company settings");
      }

      const data = await res.json();

      setSettings({
        ...defaultCompanySettings,
        ...data,
        address: {
          ...defaultCompanySettings.address,
          ...data.address,
        },
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    settings,
    loading,
    error,
    refresh,
  };
}