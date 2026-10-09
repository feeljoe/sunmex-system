"use client";

import { useEffect, useState } from "react";
import {
    useCompanySettings,
    CompanySettings,
} from "@/utils/useCompanySettings";
import { states } from "@/lib/states";

export default function CompanySettingsForm() {
    const { settings, loading, error, refresh } =
        useCompanySettings();

    const [form, setForm] = useState<CompanySettings>(settings);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [saveError, setSaveError] = useState("");

    useEffect(() => {
        setForm(settings);
    }, [settings]);

    const updateAddress = (
        field: keyof CompanySettings["address"],
        value: string
    ) => {
        setForm(prev => ({
            ...prev,
            address: {
                ...prev.address,
                [field]: value,
            },
        }));
    };

    const saveSettings = async (e: React.FormEvent) => {
        e.preventDefault();

        setSaving(true);
        setMessage("");
        setSaveError("");

        try {
            const res = await fetch("/api/company-settings", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    companyName: form.companyName,
                    address: form.address,
                    phone: form.phone,
                    email: form.email,
                    website: form.website,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(
                    data.error || "Could not save settings"
                );
            }

            setMessage("Company settings saved successfully!");
            await refresh();

        } catch (err: any) {
            setSaveError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <p className="p-4">Loading company settings...</p>;
    }

    if (error) {
        return (
            <div className="p-4 text-red-600">
                {error}
            </div>
        );
    }

    const inputClass =
        "w-full p-3 bg-white border border-gray-300 " +
        "rounded-xl outline-none focus:ring-2 focus:ring-blue-400";

    return (
        <form
            onSubmit={saveSettings}
            className="bg-(--secondary) rounded-xl shadow-xl p-2 mt-2
                 w-[97vw] md:w-[70vw] mx-auto space-y-2"
        >
            <div>
                <label className="font-semibold block mb-1">
                    Company Name
                </label>

                <input
                    className={inputClass}
                    value={form.companyName}
                    onChange={e =>
                        setForm(prev => ({
                            ...prev,
                            companyName: e.target.value,
                        }))
                    }
                />
            </div>

            <h2 className="text-lg font-bold border-b pb-2">
                Company Address
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(
                    [
                        ["street", "Street Address"],
                        ["street2", "Suite / Unit"],
                    ] as const
                ).map(([field, label]) => (
                    <div key={field}>
                        <label className="font-semibold block mb-1">
                            {label}
                        </label>

                        <input
                            className={inputClass}
                            value={form.address[field]}
                            onChange={e =>
                                updateAddress(field, e.target.value)
                            }
                        />
                    </div>
                ))}
                <div>
                    <label className="font-semibold block mb-1">City</label>
                    <input
                        className={inputClass}
                        value={form.address.city}
                        onChange={e => updateAddress("city", e.target.value)}
                    />
                </div>
                <div>
                    <label className="font-semibold block mb-1">State</label>
                    <div className={inputClass}>
                    <select name='state' value={form.address.state} onChange={e => updateAddress("state", e.target.value)} className='w-full h-full cursor-pointer' required>
                        <option value='1' className='text-gray-300'>Select State</option>
                        {states.map((state) => (
                            <option key={state.value} value={state.value} className="text-gray-300">{state.value} ({state.name})</option>
                        ))}
                    </select>
                    </div>
                </div>
                {(
                    [
                        ["zipCode", "ZIP Code"],
                        ["country", "Country"],
                    ] as const
                ).map(([field, label]) => (
                    <div key={field}>
                        <label className="font-semibold block mb-1">
                            {label}
                        </label>

                        <input
                            className={inputClass}
                            value={form.address[field]}
                            onChange={e =>
                                updateAddress(field, e.target.value)
                            }
                        />
                    </div>
                ))}
            </div>

            <h2 className="text-lg font-bold border-b pb-2">
                Contact Information
            </h2>

            {(
                [
                    ["phone", "Phone"],
                    ["email", "Email"],
                    ["website", "Website"],
                ] as const
            ).map(([field, label]) => (
                <div key={field}>
                    <label className="font-semibold block mb-1">
                        {label}
                    </label>

                    <input
                        key={field}
                        className={inputClass}
                        value={form[field]}
                        onChange={e =>
                            setForm(prev => ({
                                ...prev,
                                [field]: e.target.value,
                            }))
                        }
                    />
                </div>
            ))}

            {message && (
                <p className="text-green-600 font-semibold">
                    {message}
                </p>
            )}

            {saveError && (
                <p className="text-red-600 font-semibold">
                    {saveError}
                </p>
            )}

            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={saving}
                    className="bg-blue-600 text-white px-6 py-3
                     rounded-xl font-bold cursor-pointer
                     hover:bg-blue-700 disabled:opacity-50"
                >
                    {saving ? "Saving..." : "Save Changes"}
                </button>
            </div>
        </form>
    );
}