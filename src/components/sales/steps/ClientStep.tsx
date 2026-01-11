"use client";

import { useList } from "@/utils/useList";
import { SearchBar } from "@/components/ui/SearchBar";

export default function ClientStep({
    mode,
    onSelect,
}: {
    mode: "preorder" | "direct";
    onSelect: (client: any) => void;
}) {
    const endpoint =
        mode === "direct"
        ? "/api/routes/my"
        : "/api/clients";
    
    const { items: clients } = useList(endpoint);

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold">Select Client</h2>

            <SearchBar
                placeholder="Search Client..."
                onSearch={() => {}}
            />
            <div className="max-h-96 overflow-y-auto border rounded-xl">
                <table className="w-full text-left">
                    <tbody>
                        {clients.map((c:any) => (
                            <tr
                                key={c._id}
                                className="border-b hover:bg-gray-50 cursor-pointer"
                                onClick={() => onSelect(c)}
                            >
                                <td className="p-3 font-medium">
                                    {c.clientName}
                                </td>
                                <td className="p-3 text-sm text-gray-500">
                                    {c.addressLine} {c.city} {c.state}, {c.country} {c.zipCode}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}