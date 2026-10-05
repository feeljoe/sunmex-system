"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  useList,
} from "@/utils/useList";

import PrepareOrderModal from "../modals/PreparePreorderModal";

import {
  RefreshButton,
} from "../ui/RefreshButton";

import SubmitResultModal from "../modals/SubmitResultModal";

import {
  formatCurrency,
} from "@/utils/format";


export function WarehousePreordersTable({
  user,
}: any) {

  // ==================================================
  // DATA
  // ==================================================

  const {
    items: preorderItems,
    reload,
  } = useList(
    "/api/preOrders/warehouse"
  );


  const preorders =
    preorderItems || [];


  const {
    items: categories,
  } = useList(
    "/api/types",
    {
      limit: 100,
    }
  );


  const sortedCategories =
    [
      ...(categories || []),
    ].sort(
      (a, b) =>
        (a.order || 0) -
        (b.order || 0)
    );


  // ==================================================
  // STATE
  // ==================================================

  const [
    selectedRoute,
    setSelectedRoute,
  ] = useState("");


  const [
    selectedPreorder,
    setSelectedPreorder,
  ] = useState<any | null>(
    null
  );


  const [
    viewMode,
    setViewMode,
  ] = useState<
    "pending" | "completed"
  >("pending");


  const [
    submitStatus,
    setSubmitStatus,
  ] = useState<
    "loading" | null
  >(null);


  // ==================================================
  // USER LOCATION LABEL
  // ==================================================

  const location =
    user?.location ||
    "phoenix";


  const locationLabel: Record<
    string,
    string
  > = {
    phoenix: "Phoenix",
    yuma: "Yuma",
    tucson: "Tucson",
    elPaso: "El Paso",
    lasVegas: "Las Vegas",
  };


  // ==================================================
  // AVAILABLE ROUTES
  //
  // Only show routes that exist in the preorders
  // returned for this warehouse location.
  // ==================================================

  const routes =
    useMemo(() => {

      const routeMap =
        new Map<
          string,
          any
        >();


      for (
        const preorder of preorders
      ) {

        const route =
          preorder.routeAssigned;


        if (
          route?._id &&
          !routeMap.has(
            route._id
          )
        ) {

          routeMap.set(
            route._id,
            route
          );

        }
      }


      return Array.from(
        routeMap.values()
      );

    }, [preorders]);


  // ==================================================
  // FILTER
  // ==================================================

  const filteredPreorders =
    preorders.filter(
      (p: any) => {

        if (
          selectedRoute &&
          p.routeAssigned?._id !==
            selectedRoute
        ) {
          return false;
        }


        if (
          viewMode ===
            "pending" &&
          p.status !==
            "assigned"
        ) {
          return false;
        }


        if (
          viewMode ===
            "completed" &&
          p.status !==
            "ready"
        ) {
          return false;
        }


        return true;
      }
    );


  // ==================================================
  // DATE
  // ==================================================

  const formatDate = (
    value?: string
  ) =>
    value
      ? new Date(
          value
        ).toLocaleDateString()
      : "-";


  // ==================================================
  // STATUS COLORS
  // ==================================================

  const statusColors:
    Record<
      string,
      string
    > = {
      assigned:
        "bg-purple-400 text-purple-800",

      ready:
        "bg-green-400 text-green-800",
    };


  // ==================================================
  // VIEW CHANGE
  // ==================================================

  const changeView = (
    value:
      | "pending"
      | "completed"
  ) => {

    if (
      viewMode === value
    ) {
      return;
    }


    setSubmitStatus(
      "loading"
    );

    setViewMode(
      value
    );


    setTimeout(
      () =>
        setSubmitStatus(
          null
        ),
      500
    );
  };


  return (
    <>

      <div
        className={`
          bg-(--secondary)
          font-mono
          font-bold
          rounded-xl
          shadow-xl
          p-4
          flex
          flex-col

          ${
            user.role === "admin"
              ? "h-[85vh] w-[88vw]"
              : "h-[80vh] w-[97vw]"
          }
        `}
      >

        {/* =========================================
            HEADER
        ========================================= */}

        <div className="flex items-center justify-between mb-2 gap-4">


          {/* ROUTE FILTER */}

          <div className="flex gap-4 items-center h-10">

            <label className="font-semibold">

              Route:

            </label>


            <select
              value={
                selectedRoute
              }

              onChange={(e) =>
                setSelectedRoute(
                  e.target.value
                )
              }

              className="rounded-xl h-10 bg-white shadow-xl p-2 outline-hidden"
            >

              <option value="">
                All Routes
              </option>


              {routes.map(
                (route: any) => (

                  <option
                    key={
                      route._id
                    }
                    value={
                      route._id
                    }
                  >

                    {route.code}

                    {route.user
                      ? ` | ${route.user.firstName} ${route.user.lastName}`
                      : ""}

                  </option>

                )
              )}

            </select>

          </div>


          {/* LOCATION */}

          <div className="px-4 py-2 bg-white rounded-xl shadow">

            <span className="text-gray-500 mr-2">
              Warehouse:
            </span>

            <span className="text-blue-700">
              {locationLabel[
                location
              ] ||
                "Phoenix"}
            </span>

          </div>


          {/* STATUS */}

          <div className="flex gap-2 p-1 bg-gray-200 rounded-xl">

            <button
              onClick={() =>
                changeView(
                  "pending"
                )
              }
              className={`
                px-4
                py-1
                font-bold
                rounded-lg
                transition-all
                cursor-pointer

                ${
                  viewMode ===
                  "pending"
                    ? "bg-white shadow-md text-blue-800"
                    : "text-gray-500 hover:bg-gray-400"
                }
              `}
            >

              Pending

            </button>


            <button
              onClick={() =>
                changeView(
                  "completed"
                )
              }
              className={`
                px-4
                py-1
                font-bold
                rounded-lg
                transition-all
                cursor-pointer

                ${
                  viewMode ===
                  "completed"
                    ? "bg-white shadow-md text-green-800"
                    : "text-gray-500 hover:bg-gray-400"
                }
              `}
            >

              Completed

            </button>

          </div>


          {/* REFRESH */}

          <RefreshButton
            onRefresh={() => {

              setSubmitStatus(
                "loading"
              );

              reload();

              setTimeout(
                () =>
                  setSubmitStatus(
                    null
                  ),
                1000
              );

            }}
          />

        </div>


        {/* =========================================
            TABLE
        ========================================= */}

        <div className="overflow-y-auto rounded-xl shadow-xl bg-white">

          <table className="w-full text-left text-sm whitespace-nowrap">

            <thead className="bg-(--tertiary) sticky top-0">

              <tr className="border-b">

                <th className="p-2">
                  Client
                </th>

                <th className="p-2 text-center">
                  Route
                </th>

                <th className="p-2 text-center">
                  Location
                </th>

                <th className="p-2 text-center">
                  Status
                </th>

                <th className="p-2 text-center">
                  Total Items
                </th>

                <th className="p-2 text-center overflow-y-auto w-40">
                  Amount ($)
                </th>

                <th className="p-2 text-center">
                  Date
                </th>

                <th className="p-2 text-center">
                  Action
                </th>

              </tr>

            </thead>


            <tbody className="bg-white">

              {filteredPreorders.length ===
                0 && (

                <tr>

                  <td
                    colSpan={8}
                    className="p-10 text-center text-gray-500"
                  >

                    No{" "}
                    {viewMode ===
                    "pending"
                      ? "pending"
                      : "completed"}{" "}
                    preorders for{" "}
                    {locationLabel[
                      location
                    ] ||
                      "Phoenix"}.

                  </td>

                </tr>

              )}


              {filteredPreorders.map(
                (p: any) => {

                  const status =
                    p.status ===
                    "assigned"
                      ? "pending"
                      : p.status ===
                        "ready"
                      ? "Assembled"
                      : p.status;


                  const preorderLocation =
                    p.inventoryLocation ||
                    "phoenix";


                  return (

                    <tr
                      key={
                        p._id
                      }
                      className={`
                        border-b
                        hover:bg-gray-100

                        ${
                          p.status ===
                          "ready"
                            ? "bg-green-100"
                            : ""
                        }
                      `}
                    >

                      {/* CLIENT */}

                      <td className="p-2 capitalize">

                        {p.client
                          ?.clientName
                          ?.toLowerCase() ||
                          "-"}

                      </td>


                      {/* ROUTE */}

                      <td className="p-2 text-center">

                        {p.routeAssigned
                          ?.code ||
                          "-"}

                      </td>


                      {/* LOCATION */}

                      <td className="p-2 text-center">

                        <span
                          className={`
                            px-2
                            py-1
                            rounded-xl
                            capitalize

                            ${
                              preorderLocation ===
                              "phoenix"
                                ? "bg-gray-200 text-gray-700"
                                : "bg-blue-100 text-blue-700"
                            }
                          `}
                        >

                          {locationLabel[
                            preorderLocation
                          ] ||
                            preorderLocation}

                        </span>

                      </td>


                      {/* STATUS */}

                      <td className="text-center">

                        <span
                          className={`
                            p-2
                            rounded-xl
                            font-bold

                            ${
                              statusColors[
                                p.status
                              ] ||
                              "bg-gray-400"
                            }
                          `}
                        >

                          {status
                            ?.toUpperCase()}

                        </span>

                      </td>


                      {/* ITEMS */}

                      <td className="p-2 text-center">

                        {p.products.reduce(
                          (
                            sum: number,
                            product:
                              any
                          ) =>
                            sum +
                            Number(
                              product.quantity ||
                                0
                            ),
                          0
                        )}

                      </td>


                      {/* CATEGORY TOTALS */}

                      <td className="flex gap-2 py-1 overflow-auto w-60">

                        {sortedCategories.map(
                          (category) => {

                            const categoryTotal =
                              p.products

                                .filter(
                                  (
                                    product:
                                      any
                                  ) =>
                                    product
                                      .productInventory
                                      ?.product
                                      ?.productType
                                      ?._id ===
                                    category._id
                                )

                                .reduce(
                                  (
                                    sum:
                                      number,
                                    product:
                                      any
                                  ) =>
                                    sum +
                                    Number(
                                      product.quantity ||
                                        0
                                    ) *
                                      Number(
                                        product.actualCost ||
                                          0
                                      ),
                                  0
                                );


                            if (
                              categoryTotal <=
                              0
                            ) {
                              return null;
                            }


                            return (

                              <div
                                key={
                                  category._id
                                }
                                className="p-1 flex flex-col text-center font-bold bg-blue-200 text-blue-800 rounded-xl"
                              >

                                <span className="capitalize">

                                  {category.name
                                    ?.toLowerCase()}

                                </span>


                                <span>

                                  {formatCurrency(
                                    categoryTotal
                                  )}

                                </span>

                              </div>

                            );
                          }
                        )}

                      </td>


                      {/* DATE */}

                      <td className="p-2 text-center">

                        {formatDate(
                          p.createdAt
                        )}

                      </td>


                      {/* ACTION */}

                      <td className="p-2 text-center">

                        <button
                          className={`
                            p-2
                            rounded-xl
                            transition-all
                            duration-300
                            cursor-pointer

                            ${
                              p.status ===
                              "assigned"
                                ? "bg-blue-400 text-blue-800 hover:text-white hover:bg-blue-800"
                                : "bg-yellow-400 text-yellow-800 hover:text-white hover:bg-gray-800"
                            }
                          `}
                          onClick={() =>
                            setSelectedPreorder(
                              p
                            )
                          }
                        >

                          {p.status ===
                          "assigned"
                            ? "Prepare"
                            : "Review"}

                        </button>

                      </td>

                    </tr>

                  );
                }
              )}

            </tbody>

          </table>

        </div>

      </div>


      {/* =========================================
          PREPARE MODAL
      ========================================= */}

      {selectedPreorder && (

        <PrepareOrderModal
          user={
            user
          }

          preorder={
            selectedPreorder
          }

          categories={
            sortedCategories
          }

          onClose={() =>
            setSelectedPreorder(
              null
            )
          }

          readOnly={
            selectedPreorder
              ?.status ===
            "ready"
          }

          onCompleted={() => {

            setSelectedPreorder(
              null
            );

            reload();

          }}
        />

      )}


      {/* =========================================
          LOADING
      ========================================= */}

      {submitStatus && (

        <SubmitResultModal
          status={
            submitStatus
          }

          message=""
          onClose={() =>
            setSubmitStatus(
              null
            )
          }

          collection="Warehouse Preorders"
        />

      )}

    </>
  );
}