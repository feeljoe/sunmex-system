"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/utils/format";
import { RefreshButton } from "../ui/RefreshButton";
import ForeignInventoryDetailsModal from "../modals/ForeignInventoryDetailsModal";
import SubmitResultModal from "../modals/SubmitResultModal";

type InventoryView =
| "routes"
| "locations";

export default function ForeignInventoryTable({userId} : {userId:any}) {
  const [view, setView] = useState<InventoryView>("routes");

  const [routeInventory, setRouteInventory] = useState<any[]>([]);
  const [foreignInventory, setForeignInventory] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  
  const [selectedInventory, setSelectedInventory] = useState<any | null>(null);
  const [submitStatus, setSubmitStatus] = useState<"loading" | "error" | null>(null);
  const [message, setMessage] = useState("");

  const fetchRouteInventory = async () => {
    setLoading(true);
    setSubmitStatus("loading");
    try {
      const res = await fetch("/api/routes/inventory");
      if (res.ok) {
        const data = await res.json();
        setRouteInventory(data.items || []);
        setSubmitStatus(null);
      }
    } catch (error) {
      console.error("Failed to fetch route inventory:", error);
      setSubmitStatus("error");
      setMessage("Failed to fetch route inventory");
    } finally {
      setLoading(false);
    }
  };

  const fetchForeingInventory = async () => {
    setLoading(true);
    setSubmitStatus("loading");
    try {
      const res = await fetch("/api/foreignInventory/summary");
      const data = await res.json();
      if(!res.ok){
        throw new Error(data.error || "Failed to fetch foreign inventory");
      }
      setForeignInventory(data.items || []);
      setSubmitStatus(null);
    } catch(error: any) {
      console.error("Failed to fetch foreign inventory: ", error);
      setMessage(`failed to fetch foreign inventory:  ${error}`);
      setSubmitStatus("error");
    } finally{
      setLoading(false);
    }
  }

  useEffect(() => {
    setSelectedInventory(null);
    if(view === "routes"){
      fetchRouteInventory();
    } else {
      fetchForeingInventory();
    }
    
  }, [view]);

  const handleRefresh = async () => {
    if (view === "routes") {
      await fetchRouteInventory();
    }else {
      await fetchForeingInventory();
    }
  };

  const inventoryData = view === "routes" ? routeInventory : foreignInventory;

  return (
    <div className="bg-(--secondary) p-2 rounded-xl shadow-xl w-[80vw] mx-auto h-[80vh] flex flex-col">
      <div className="flex justify-between items-end border-b pb-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold">
            {view === "routes"
              ? "Active Route Inventory"
              : "Foreign Inventory"}
          </h2>
          <p className="text-gray-600">
            {view === "routes"
              ? "Live view of product quantities and monetary value currently on routes."
              : "Inventory currently stored at Yuma, Tucson, El Paso and Las Vegas."
            }
          </p>
        </div>
        <RefreshButton onRefresh={handleRefresh} />
      </div>
      <div className="flext justify-center mb-2">
        <div className="inline-flex bg-white rounded-xl p-1">
          <button
            type="button"
              onClick={() => setView("routes")}
              className={`p-2 rounded-xl font-semibold transition-colors cursor-pointer ${view === "routes" ? "bg-blue-600 text-white shadow-xl": "text-gray-600 hover:bg-gray-100"}`}>
                Route Inventory
          </button>
          <button
            type="button"
              onClick={() => setView("locations")}
              className={`p-2 rounded-xl font-semibold transition-colors cursor-pointer ${view === "locations" ? "bg-blue-600 text-white shadow-xl": "text-gray-600 hover:bg-gray-100"}`}>
                Foreign Locations
          </button>
        </div>
      </div>
      {view === "routes" && (

      <div className="flex-1 overflow-y-auto bg-white rounded-xl shadow-xl">

          <table className="w-full text-left text-sm">

            <thead className="sticky top-0 bg-(--tertiary) z-10 border-b-3 text-lg">

              <tr>

                <th className="p-2 font-semibold">
                  Route Code
                </th>

                <th className="p-2 font-semibold">
                  Assigned User
                </th>

                <th className="p-2 font-semibold text-right">
                  Total Items
                </th>

                <th className="p-2 font-semibold text-right">
                  Total Value
                </th>

              </tr>

            </thead>


            <tbody>

              {loading ? (

                <tr>

                  <td
                    colSpan={4}
                    className="p-8 text-center text-gray-500 font-bold"
                  >
                    Loading Inventory...
                  </td>

                </tr>

              ) : inventoryData.length === 0 ? (

                <tr>

                  <td
                    colSpan={4}
                    className="p-8 text-center text-gray-500"
                  >
                    No inventory found on any active routes.
                  </td>

                </tr>

              ) : (

                inventoryData.map(
                  (route) => (

                    <tr
                      key={
                        route._id
                      }

                      onClick={() =>
                        setSelectedInventory(
                          route
                        )
                      }

                      className="border-b hover:bg-blue-50 cursor-pointer transition-colors"
                    >

                      <td className="p-4 font-bold text-lg">

                        {route.code}

                      </td>


                      <td className="p-4 capitalize">

                        {route.user
                          ? `${route.user.firstName} ${route.user.lastName}`
                          : (
                            <span className="text-red-500 italic">
                              Unassigned
                            </span>
                          )}

                      </td>


                      <td className="p-4 text-right font-mono text-gray-700">

                        {route.totalQuantity} units

                      </td>


                      <td className="p-4 text-right font-bold text-green-600 border-l-2 text-lg">

                        {formatCurrency(
                          route.totalValue
                        )}

                      </td>

                    </tr>

                  )
                )

              )}

            </tbody>

          </table>

        </div>

      )}
      {view === "locations" && (

<div className="flex-1 overflow-y-auto bg-white rounded-xl shadow-xl">

  <table className="w-full text-left text-sm">

    <thead className="sticky top-0 bg-(--tertiary) z-10 border-b-3 text-lg">

      <tr>

        <th className="p-2 font-semibold">
          Location
        </th>

        <th className="p-2 font-semibold text-right">
          Products
        </th>

        <th className="p-2 font-semibold text-right">
          Current Inventory
        </th>

        <th className="p-2 font-semibold text-right">
          Total Value
        </th>

      </tr>

    </thead>


    <tbody>

      {loading ? (

        <tr>

          <td
            colSpan={4}
            className="p-8 text-center text-gray-500 font-bold"
          >
            Loading Inventory...
          </td>

        </tr>

      ) : inventoryData.length === 0 ? (

        <tr>

          <td
            colSpan={4}
            className="p-8 text-center text-gray-500"
          >
            No foreign inventory found.
          </td>

        </tr>

      ) : (

        inventoryData.map(
          (location) => (

            <tr
              key={
                location.location
              }

              onClick={() =>
                setSelectedInventory(
                  location
                )
              }

              className="border-b hover:bg-blue-50 cursor-pointer transition-colors"
            >

              {/* LOCATION */}

              <td className="p-4 font-bold text-lg">

                {
                  location.locationName
                }

              </td>


              {/* PRODUCT COUNT */}

              <td className="p-4 text-right">

                {
                  location.totalProducts
                }

              </td>


              {/* INVENTORY */}

              <td className="p-4 text-right font-mono text-gray-700">

                {
                  location.totalQuantity
                }{" "}
                units

              </td>


              {/* VALUE */}

              <td className="p-4 text-right font-bold text-green-600 border-l-2 text-lg">

                {formatCurrency(
                  location.totalValue
                )}

              </td>

            </tr>

          )
        )

      )}

    </tbody>

  </table>

</div>

)}


      {selectedInventory && (
        <ForeignInventoryDetailsModal 
          adminId={userId}
          type={view === "routes" ? "route" : "location"}
          inventory={selectedInventory} 
          onClose={() => setSelectedInventory(null)} 
        />
      )}
      {submitStatus && (
        <SubmitResultModal
          status={submitStatus}
          message={message}
          onClose={() => {
            setSubmitStatus(null);
            setMessage("");
            }
          }
          collection="Foreign Inventory"
        />
      )}
    </div>
  );
}