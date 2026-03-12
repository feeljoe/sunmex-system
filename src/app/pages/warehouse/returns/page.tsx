"use client";

import { useEffect, useState } from "react";

export default function WarehouseReturnsPage() {
    const [returns,setReturns] = useState<any[]>([]);
    const [loading,setLoading] = useState(true);
    const [driverSignature,setDriverSignature] = useState("");
    const [warehouseSignature,setWarehouseSignature] = useState("");

    useEffect(()=>{
        fetchReturns();
    },[]);
    
    const fetchReturns = async () => {
        const res = await fetch("/api/warehouse/returns");
        const data = await res.json();
        setReturns(data);
        setLoading(false);
    };
    
    const groupedProducts = returns.flatMap((cm:any)=>cm.products.map((p:any)=>({
        creditMemoId: cm._id,
        product: p.product,
        pickedQuantity: p.pickedQuantity,
        returnReason: p.returnReason,
    })));
    
    const goodReturns = groupedProducts.filter(
        (p:any)=>p.returnReason === "good return"
    );
    
    const creditReturns = groupedProducts.filter(
        (p:any)=>p.returnReason === "credit memo"
    );
    
    const completeWarehouse = async () => {
        await fetch("/api/warehouse/returns/complete",{
            method:"PATCH",
            headers:{ "Content-Type":"application/json" },
            body:JSON.stringify({
                creditMemoIds: returns.map((r)=>r._id),
                products: groupedProducts,
                warehouseUser:"WAREHOUSE_USER_ID",
                driverSignature,
                warehouseSignature,
            }),
        });
        alert("Warehouse receiving completed");
        fetchReturns();
    };
    
    if(loading) return <div>Loading...</div>;

    return(
        <div className="p-10 space-y-10">
            <h1 className="text-3xl font-bold">
                Warehouse Returns
            </h1>
            <div>
                <h2 className="text-xl font-semibold mb-4">
                    Good Returns (Back to Inventory)
                </h2>
                <div className="space-y-3">
                    {goodReturns.map((p:any,i:number)=>(
                    <div key={i} className="p-3 border rounded flex justify-between">
                        <div>
                            {p.product?.brand?.name} {p.product?.name}
                        </div>
                        <div>
                            Qty: {p.pickedQuantity}
                        </div>
                    </div>
                    ))}
                </div>
            </div>
            <div>
                <h2 className="text-xl font-semibold mb-4">
                    Credit Memo / Throw Out
                </h2>
                <div className="space-y-3">
                    {creditReturns.map((p:any,i:number)=>(
                    <div key={i} className="p-3 border rounded flex justify-between">
                        <div>
                            {p.product?.brand?.name} {p.product?.name}
                        </div>
                        <div>
                            Qty: {p.pickedQuantity}
                        </div>
                    </div>
                    ))}
                </div>
            </div>
            <div className="space-y-4">
                <input
                    placeholder="Driver Signature"
                    value={driverSignature}
                    onChange={(e)=>setDriverSignature(e.target.value)}
                    className="border p-3 rounded w-full"
                />
                <input
                    placeholder="Warehouse Signature"
                    value={warehouseSignature}
                    onChange={(e)=>setWarehouseSignature(e.target.value)}
                    className="border p-3 rounded w-full"
                />
                <button
                    onClick={completeWarehouse}
                    className="bg-green-600 text-white px-6 py-3 rounded"
                >
                    Complete Receiving
                </button>
            </div>
        </div>
    );
}