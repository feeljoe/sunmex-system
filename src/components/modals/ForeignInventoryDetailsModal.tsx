"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/utils/format";
import ConfirmInventoryModal from "./ConfirmInventoryModal";

type InventoryType = "route" | "location";
type ForeignInventoryDetailsModalProps = {
  type: InventoryType;
  inventory: any;
  adminId: string;
  onClose: () => void;
}
export default function ForeignInventoryDetailsModal({ type, inventory, adminId, onClose }: ForeignInventoryDetailsModalProps) {
  const [showAuditor, setShowAuditor] = useState(false);

  if (!inventory) return null;

  const isRoute = type === "route";

  const isLocation = type === "location";

  const rawInventory = isRoute ? inventory.detailedInventory || [] : inventory.products || [];

  const sortedInventory = useMemo(() => {
    return [...rawInventory].sort((a: any, b: any) => {
      const pA = a.product;
      const pB = b.product;
      if (!pA && !pB) {
        return 0;
      }
      if (!pA) {
        return 1;
      }
      if (!pB) {
        return -1;
      }
      const brandA = pA.brand?.name?.toLowerCase() || "zzz_unassigned";
      const brandB = pB.brand?.name?.toLowerCase() || "zzz_unassigned";

      const brandCompare = brandA.localeCompare(brandB);
      if (brandCompare !== 0) {
        return brandCompare;
      }

      const nameA = pA.name?.toLowerCase() || "";
      const nameB = pB.name?.toLowerCase() || "";

      const nameCompare = nameA.localeCompare(nameB);
      if (nameCompare !== 0) {
        return nameCompare;
      }
      const quantityA = isRoute ? Number(a.quantity || 0) : Number(a.currentInventory || 0);
      const quantityB = isRoute ? Number(b.quantity || 0) : Number(b.currentInventory || 0);

      return (quantityB - quantityA);
    });
  }, [rawInventory, isRoute]);

  const locationTotals = useMemo(() => {
    if (!isLocation) {
      return null;
    }
    return sortedInventory.reduce((
      totals, item: any
    ) => {
      const current = Number(item.currentInventory || 0);
      const preSaved = Number(item.preSavedInventory || 0);
      const onRoute = Number(item.onRouteInventory || 0);
      const inactive = Number(item.inactiveInventory || 0);

      const unitCost = Number(item.product?.unitCost || 0);

      totals.current += current;
      totals.preSaved += preSaved;
      totals.onRoute += onRoute;
      totals.inactive += inactive;

      totals.currentValue += current * unitCost;

      totals.totalValue += (current + preSaved + onRoute + inactive) * unitCost;

      return totals;
    }, {
      current: 0,
      preSaved: 0,
      onRoute: 0,
      inactive: 0,
      currentValue: 0,
      totalValue: 0,
    });
  }, [sortedInventory, isLocation]);

  const title = isRoute ? `Route ${inventory.code} Inventory Details` : `${inventory.locationName || inventory.location} Inventory Details`;


  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div onClick={(e) => e.stopPropagation()} className="bg-(--secondary) p-6 rounded-xl shadow-2xl w-[90vw] max-h-[80vh] flex flex-col">

          {/* Header */}
          <div className="flex justify-between items-center border-b pb-4 mb-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-800">{title}</h3>
              {isRoute && (

                <p className="font-bold capitalize">

                  Assigned to:{" "}

                  {inventory.user
                    ? `${inventory.user.firstName} ${inventory.user.lastName}`
                    : "Unassigned"}

                </p>

              )}


              {/* LOCATION INFORMATION */}

              {isLocation && (

                <div className="flex gap-4 mt-1 text-sm">

                  <p>

                    <span className="font-bold">
                      Location:
                    </span>{" "}

                    <span className="capitalize">
                      {inventory.locationName ||
                        inventory.location}
                    </span>

                  </p>


                  <p>

                    <span className="font-bold">
                      Products:
                    </span>{" "}

                    {inventory.totalProducts ??
                      sortedInventory.length}

                  </p>

                </div>

              )}
            </div>
            <button
              onClick={onClose}
              className="px-2 py-2 bg-red-500 text-white rounded-xl hover:bg-red-300 hover:text-red-800 cursor-pointer transition-all duration-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Product List */}
          <div className="flex-1 overflow-auto rounded-xl shadow-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-(--tertiary) sticky top-0">
                <tr className="whitespace-nowrap font-semibold">
                  <th className="p-2">SKU</th>
                  <th className="p-2">UPC</th>
                  <th className="p-2">Brand</th>
                  <th className="p-2">Product</th>
                  <th className="p-2">Unit Cost</th>
                  {isRoute && (
                    <>
                      <th className="p-2">Quantity</th>
                      <th className="p-2">Total Line Cost</th>
                    </>
                  )}
                  {isLocation && (
                    <>
                      <th className="p-2 text-right">Current</th>
                      <th className="p-2 text-right">Reserved</th>
                      <th className="p-2 text-right">On Route</th>
                      <th className="p-2 text-right">Inactive</th>
                      <th className="p-2 text-right">Total Units</th>
                      <th className="p-2 text-right">Current Value</th>
                    </>
                  )}

                </tr>
              </thead>
              <tbody>


                {/* ==========================================
                    EMPTY STATE
                ========================================== */}

                {sortedInventory.length === 0 && (

                  <tr>

                    <td
                      colSpan={
                        isRoute
                          ? 7
                          : 11
                      }
                      className="p-10 text-center text-gray-500 text-lg"
                    >

                      No inventory found.

                    </td>

                  </tr>

                )}


                {/* ==========================================
                    PRODUCTS
                ========================================== */}

                {sortedInventory.map(
                  (
                    item: any,
                    index: number
                  ) => {

                    const product =
                      item.product;


                    if (!product) {
                      return null;
                    }


                    const unitValue =
                      Number(
                        product.unitCost ||
                        0
                      );


                    // ======================================
                    // ROUTE
                    // ======================================

                    const routeQuantity =
                      Number(
                        item.quantity ||
                        0
                      );


                    // ======================================
                    // LOCATION
                    // ======================================

                    const current =
                      Number(
                        item.currentInventory ||
                        0
                      );

                    const preSaved =
                      Number(
                        item.preSavedInventory ||
                        0
                      );

                    const onRoute =
                      Number(
                        item.onRouteInventory ||
                        0
                      );

                    const inactive =
                      Number(
                        item.inactiveInventory ||
                        0
                      );


                    const totalLocationUnits =
                      current +
                      preSaved +
                      onRoute +
                      inactive;


                    const displayedQuantity =
                      isRoute
                        ? routeQuantity
                        : current;


                    const lineTotal =
                      unitValue *
                      displayedQuantity;


                    return (

                      <tr
                        key={
                          item._id ||
                          product._id ||
                          index
                        }
                        className={`
                          border-b
                          bg-white
                          hover:bg-gray-100
                          whitespace-nowrap

                          ${displayedQuantity >
                            0
                            ? ""
                            : "bg-yellow-50 text-red-700"
                          }
                        `}
                      >

                        {/* SKU */}

                        <td className="p-3 font-mono">

                          {product.sku ||
                            "N/A"}

                        </td>


                        {/* UPC */}

                        <td className="p-3 font-mono">

                          {product.upc ||
                            "N/A"}

                        </td>


                        {/* BRAND */}

                        <td className="p-3 font-bold capitalize">

                          {product.brand
                            ?.name
                            ?.toLowerCase() ||
                            "N/A"}

                        </td>


                        {/* PRODUCT */}

                        <td className="p-3 font-bold capitalize">

                          {product.name
                            ?.toLowerCase()}{" "}


                          {product.weight
                            ? `${product.weight}${product.unit?.toUpperCase() || ""}`
                            : ""}


                          {product.caseSize
                            ? ` | ${product.caseSize} Units per case`
                            : ""}

                        </td>


                        {/* UNIT COST */}

                        <td className="p-3 text-right text-gray-500">

                          {formatCurrency(
                            unitValue
                          )}

                        </td>


                        {/* ==================================
                            ROUTE
                        ================================== */}

                        {isRoute && (

                          <>

                            <td className="p-3 text-right font-bold">

                              {routeQuantity}

                            </td>


                            <td
                              className={`
                                p-3
                                text-right
                                font-bold
                                border-l-2

                                ${routeQuantity >
                                  0
                                  ? "text-green-700"
                                  : "text-red-700"
                                }
                              `}
                            >

                              {formatCurrency(
                                lineTotal
                              )}

                            </td>

                          </>

                        )}


                        {/* ==================================
                            LOCATION
                        ================================== */}

                        {isLocation && (

                          <>

                            {/* CURRENT */}

                            <td className="p-3 text-right font-bold text-green-700">

                              {current}

                            </td>


                            {/* RESERVED */}

                            <td className="p-3 text-right font-bold text-blue-700">

                              {preSaved}

                            </td>


                            {/* ON ROUTE */}

                            <td className="p-3 text-right font-bold text-orange-700">

                              {onRoute}

                            </td>


                            {/* INACTIVE */}

                            <td
                              className={`p-3 text-right font-bold ${inactive > 0
                                ? "text-red-700"
                                : "text-gray-500"
                                }`}
                            >

                              {inactive}

                            </td>


                            {/* TOTAL LOCATION UNITS */}

                            <td className="p-3 text-right font-bold border-l">

                              {totalLocationUnits}

                            </td>


                            {/* CURRENT VALUE */}

                            <td
                              className={`
                                p-3
                                text-right
                                font-bold
                                border-l-2

                                ${current > 0
                                  ? "text-green-700"
                                  : "text-red-700"
                                }
                              `}
                            >

                              {formatCurrency(
                                current *
                                unitValue
                              )}

                            </td>

                          </>

                        )}

                      </tr>

                    );
                  }
                )}

              </tbody>
            </table>
          </div>

          {/* Footer Controls */}
          <div className="mt-6 flex justify-between items-center">
            {/* ================================================
                ROUTE AUDITOR
            ================================================ */}

            <div>

              {isRoute && (

                <button
                  onClick={() =>
                    setShowAuditor(
                      true
                    )
                  }
                  className="
      bg-yellow-400
      text-yellow-800
      font-bold
      px-5
      py-3
      rounded-xl
      cursor-pointer
      hover:text-white
      hover:bg-yellow-800
      transition-colors
      duration-500
    "
                >

                  Confirm Inventory

                </button>

              )}

            </div>


            {/* ================================================
  ROUTE TOTALS
================================================ */}

            {isRoute && (

              <div className="text-right">

                <p
                  className={`
      text-xl
      font-bold

      ${inventory.totalValue >
                      0
                      ? "text-green-700"
                      : "text-red-700"
                    }
    `}
                >

                  {formatCurrency(
                    inventory.totalValue ||
                    0
                  )}

                </p>


                <p className="text-xl font-bold">

                  {inventory.totalQuantity ||
                    0}{" "}
                  total units

                </p>

              </div>

            )}


            {/* ================================================
  LOCATION TOTALS
================================================ */}

            {isLocation &&
              locationTotals && (

                <div className="flex gap-8 ml-auto">

                  <div className="text-right">

                    <p className="text-sm text-gray-500">
                      Current
                    </p>

                    <p className="text-lg font-bold text-green-700">

                      {
                        locationTotals.current
                      }{" "}
                      units

                    </p>

                  </div>


                  <div className="text-right">

                    <p className="text-sm text-gray-500">
                      Reserved
                    </p>

                    <p className="text-lg font-bold text-blue-700">

                      {
                        locationTotals.preSaved
                      }{" "}
                      units

                    </p>

                  </div>


                  <div className="text-right">

                    <p className="text-sm text-gray-500">
                      On Route
                    </p>

                    <p className="text-lg font-bold text-orange-700">

                      {
                        locationTotals.onRoute
                      }{" "}
                      units

                    </p>

                  </div>


                  <div className="text-right">

                    <p className="text-sm text-gray-500">
                      Inactive
                    </p>

                    <p className="text-lg font-bold text-red-700">

                      {
                        locationTotals.inactive
                      }{" "}
                      units

                    </p>

                  </div>


                  <div className="text-right border-l pl-8">

                    <p className="text-sm text-gray-500">
                      Current Value
                    </p>

                    <p className="text-xl font-bold text-green-700">

                      {formatCurrency(
                        locationTotals.currentValue
                      )}

                    </p>


                    <p className="text-sm text-gray-500 mt-1">

                      {locationTotals.current +
                        locationTotals.preSaved +
                        locationTotals.onRoute +
                        locationTotals.inactive}{" "}
                      total tracked units

                    </p>

                  </div>

                </div>

              )}

          </div>

        </div>

      </div>


      {/* ======================================================
ROUTE INVENTORY AUDITOR
====================================================== */}

      {isRoute &&
        showAuditor && (

          <ConfirmInventoryModal
            route={
              inventory
            }

            adminId={
              adminId
            }

            onClose={() =>
              setShowAuditor(
                false
              )
            }

            onCompleted={() => {

              setShowAuditor(
                false
              );

              onClose();

            }}
          />

        )}

    </>
  );
}