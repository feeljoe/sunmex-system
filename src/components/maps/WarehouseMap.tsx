"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

interface WarehouseLocation {
    aisle?: string | number;
    bay?: string;
    level?: string | number;
}

interface WarehouseMapProps {
    open: boolean;
    location?: WarehouseLocation;
    productName?: string;
    onClose: () => void;
    onSelectLocation?: (location: WarehouseLocation) => void;
}

interface BayPosition {
    aisle: string;
    bay: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

/*
|--------------------------------------------------------------------------
| Warehouse configuration
|--------------------------------------------------------------------------
*/

const AISLE_1_BAYS = [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
];

const AISLES_2_TO_7_BAYS = [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
];

const AISLE_8_BAYS = ["D", "C", "B", "A"];

const ROUTES = ["01", "02", "03", "04", "05", "06"];

/*
|--------------------------------------------------------------------------
| Map dimensions
|--------------------------------------------------------------------------
|
| We use a virtual 1200 x 800 warehouse.
| This lets us position everything exactly like
| the warehouse drawing while allowing zoom/pan.
|
*/

const MAP_WIDTH = 1200;
const MAP_HEIGHT = 800;

export default function WarehouseMap({
    open,
    location,
    productName,
    onClose,
    onSelectLocation,
}: WarehouseMapProps) {
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });

    const [isDragging, setIsDragging] = useState(false);

    const dragStart = useRef({
        x: 0,
        y: 0,
        panX: 0,
        panY: 0,
    });

    /*
    |--------------------------------------------------------------------------
    | Normalize location
    |--------------------------------------------------------------------------
    */

    const targetAisle = location?.aisle?.toString();
    const targetBay = location?.bay?.toUpperCase();

    /*
    |--------------------------------------------------------------------------
    | Reset map when modal opens
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (open) {
            setZoom(1);
            setPan({ x: 0, y: 0 });
        }
    }, [open]);

    /*
    |--------------------------------------------------------------------------
    | Find highlighted bay
    |--------------------------------------------------------------------------
    */

    const targetPosition = useMemo(() => {
        if (!targetAisle || !targetBay) return null;

        return getBayPosition(targetAisle, targetBay);
    }, [targetAisle, targetBay]);

    /*
    |--------------------------------------------------------------------------
    | Zoom controls
    |--------------------------------------------------------------------------
    */

    const zoomIn = () => {
        setZoom((current) => Math.min(current + 0.15, 2.5));
    };

    const zoomOut = () => {
        setZoom((current) => Math.max(current - 0.15, 0.6));
    };

    const resetView = () => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };

    /*
    |--------------------------------------------------------------------------
    | Mouse dragging
    |--------------------------------------------------------------------------
    */

    const handlePointerDown = (
        event: React.PointerEvent<HTMLDivElement>
    ) => {
        event.currentTarget.setPointerCapture(event.pointerId);

        setIsDragging(true);

        dragStart.current = {
            x: event.clientX,
            y: event.clientY,
            panX: pan.x,
            panY: pan.y,
        };
    };

    const handlePointerMove = (
        event: React.PointerEvent<HTMLDivElement>
    ) => {
        if (!isDragging) return;

        const deltaX = event.clientX - dragStart.current.x;
        const deltaY = event.clientY - dragStart.current.y;

        setPan({
            x: dragStart.current.panX + deltaX,
            y: dragStart.current.panY + deltaY,
        });
    };

    const handlePointerUp = () => {
        setIsDragging(false);
    };

    /*
    |--------------------------------------------------------------------------
    | Mouse wheel zoom
    |--------------------------------------------------------------------------
    */

    const handleWheel = (
        event: React.WheelEvent<HTMLDivElement>
    ) => {
        event.preventDefault();

        if (event.deltaY < 0) {
            setZoom((current) => Math.min(current + 0.1, 2.5));
        } else {
            setZoom((current) => Math.max(current - 0.1, 0.6));
        }
    };

    /*
    |--------------------------------------------------------------------------
    | Select bay
    |--------------------------------------------------------------------------
    */

    const handleBayClick = (
        aisle: string,
        bay: string
    ) => {
        onSelectLocation?.({
            aisle,
            bay,
            level: undefined,
        });
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center">

            <div className="bg-white w-full max-w-[1500px] h-[92vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">

                {/* ============================================================
            HEADER
        ============================================================ */}

                <div className="bg-(--secondary) flex justify-between shrink-0">

                    <div className="p-2">

                        <div className="flex items-center">

                            <div className="flex flex-col p-2 rounded-xl bg-white/50 flex items-center justify-center">

                                <h2 className="text-xl font-semibold">
                                    Warehouse Location
                                </h2>

                                <p className="text-sm opacity-70">
                                    Product storage map
                                </p>
                            </div>

                        </div>

                    </div>


                    {/* Current location */}

                    <div className="flex items-center gap-2">

                        <LocationBadge
                            label="Aisle"
                            value={targetAisle ?? "—"}
                        />

                        <LocationBadge
                            label="Bay"
                            value={targetBay ?? "—"}
                        />

                        <LocationBadge
                            label="Level"
                            value={location?.level?.toString() ?? "—"}
                        />

                    </div>

                    <div className="p-2">
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-xl bg-red-400 hover:bg-red-800 text-red-800 hover:text-white text-2xl flex items-center justify-center transition-colors cursor-pointer"
                        >
                            ×
                        </button>
                    </div>
                </div>


                {/* ============================================================
            MAP AREA
        ============================================================ */}

                <div
                    className={`
            relative
            flex-1
            overflow-hidden
            bg-gray-200
            select-none
            ${isDragging ? "cursor-grabbing" : "cursor-grab"}
          `}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onWheel={handleWheel}
                >

                    {/* ========================================================
              MAP
          ======================================================== */}

                    <div
                        className="absolute left-1/2 top-1/2"
                        style={{
                            width: MAP_WIDTH,
                            height: MAP_HEIGHT,
                            transform: `
                translate(
                  calc(-50% + ${pan.x}px),
                  calc(-50% + ${pan.y}px)
                )
                scale(${zoom})
              `,
                            transformOrigin: "center center",
                        }}
                    >

                        {/* Warehouse building */}

                        <div className="absolute inset-0 bg-[#f3f3f3] border-2 border-gray-400 rounded-sm">


                            {/* ==================================================
                  AISLE 1
              ================================================== */}

                            <WarehouseRow
                                aisle="1"
                                bays={AISLE_1_BAYS}
                                x={220}
                                y={55}
                                width={540}
                                height={32}
                                onBayClick={handleBayClick}
                                targetAisle={targetAisle}
                                targetBay={targetBay}
                            />

                            <AisleLabel
                                aisle="1"
                                x={765}
                                y={62}
                            />


                            {/* ==================================================
                  AISLES 2 & 3
              ================================================== */}

                            <WarehousePair
                                topAisle="2"
                                bottomAisle="3"
                                x={160}
                                y={160}
                                width={660}
                                rowHeight={32}
                                onBayClick={handleBayClick}
                                targetAisle={targetAisle}
                                targetBay={targetBay}
                            />

                            <AisleLabel aisle="2" x={825} y={165} />
                            <AisleLabel aisle="3" x={825} y={197} />


                            {/* ==================================================
                  AISLES 4 & 5
              ================================================== */}

                            <WarehousePair
                                topAisle="4"
                                bottomAisle="5"
                                x={160}
                                y={300}
                                width={660}
                                rowHeight={32}
                                onBayClick={handleBayClick}
                                targetAisle={targetAisle}
                                targetBay={targetBay}
                            />

                            <AisleLabel aisle="4" x={825} y={305} />
                            <AisleLabel aisle="5" x={825} y={337} />


                            {/* ==================================================
                  AISLES 6 & 7
              ================================================== */}

                            <WarehousePair
                                topAisle="6"
                                bottomAisle="7"
                                x={160}
                                y={440}
                                width={660}
                                rowHeight={32}
                                onBayClick={handleBayClick}
                                targetAisle={targetAisle}
                                targetBay={targetBay}
                            />

                            <AisleLabel aisle="6" x={825} y={445} />
                            <AisleLabel aisle="7" x={825} y={477} />


                            {/* ==================================================
                  AISLE 8
              ================================================== */}

                            <div
                                className="absolute"
                                style={{
                                    left: 20,
                                    top: 515,
                                    width: 45,
                                    height: 250,
                                }}
                            >

                                {/* Aisle 8 label */}

                                <div
                                    className="absolute top-[-65px] right-[15px] text-sm font-semibold"
                                    style={{
                                        writingMode: "vertical-rl",
                                        transform: "rotate(180deg)",
                                    }}
                                >
                                    Aisle 8
                                </div>


                                {/* Bays */}

                                <div className="absolute left-0 top-0 w-full">

                                    {AISLE_8_BAYS.map((bay, index) => {

                                        const isTarget =
                                            targetAisle === "8" &&
                                            targetBay === bay;

                                        return (
                                            <button
                                                key={bay}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    handleBayClick("8", bay);
                                                }}
                                                className={`
                          absolute
                          left-0
                          w-full
                          max-w-10
                          h-[60px]
                          bg-gray-400
                          border-b-2
                          flex
                          items-center
                          justify-center
                          text-lg
                          font-medium
                          transition-all
                          
                          ${isTarget
                                                        ? "bg-green-500 hover:bg-green-800 hover:border-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.9)] z-20 scale-110"
                                                        : "hover:bg-orange-300 border-black"
                                                    }
                        `}
                                                style={{
                                                    top: index * 60,
                                                }}
                                            >
                                                {bay}
                                            </button>
                                        );
                                    })}

                                </div>

                            </div>


                            {/* ==================================================
    STORAGE + ROUTES
================================================== */}

                            {(() => {
                                const totalHeight = 670;
                                const sectionHeight = totalHeight / 2;
                                const bayHeight = sectionHeight / 6;

                                return (
                                    <div
                                        className="absolute border-l border-r border-black"
                                        style={{
                                            right: 0,
                                            top: 70,
                                            width: 30,
                                            height: totalHeight,
                                        }}
                                    >

                                        {/* ==================================================
          STORAGE
      ================================================== */}

                                        <div
                                            className="absolute top-0 left-0 w-full bg-gray-400 border-b-2 border-black"
                                            style={{
                                                height: sectionHeight,
                                            }}
                                        >

                                            {Array.from({ length: 6 }).map((_, index) => (
                                                <div
                                                    key={`storage-${index}`}
                                                    className="absolute left-0 w-full border-b hover:bg-orange-300 border-black flex items-center justify-center transition-colors"
                                                    style={{
                                                        top: index * bayHeight,
                                                        height: bayHeight,
                                                    }}
                                                >
                                                </div>
                                            ))}

                                        </div>


                                        {/* ==================================================
          ROUTES
      ================================================== */}

                                        <div
                                            className="absolute bottom-0 left-0 w-full"
                                            style={{
                                                height: sectionHeight,
                                            }}
                                        >

                                            {ROUTES.map((route, index) => (
                                                <div
                                                    key={route}
                                                    className="absolute left-0 w-full border-b border-black bg-gray-400 hover:bg-orange-300 transition-colors flex flex-col items-center justify-center"
                                                    style={{
                                                        top: index * bayHeight,
                                                        height: bayHeight,
                                                        writingMode: "vertical-rl",
                                                        transform: "rotate(180deg)"
                                                    }}
                                                >
                                                    <span className="text-xs font-semibold">
                                                        Route
                                                    </span>
                                                    <span className="text-xs font-semibold">
                                                        {route}
                                                    </span>
                                                </div>
                                            ))}

                                        </div>

                                    </div>
                                );
                            })()}


                            {/* ==================================================
    STORAGE LABEL
================================================== */}

                            <div
                                className="absolute"
                                style={{
                                    right: -40,
                                    top: 178,
                                    writingMode: "vertical-rl",
                                    transform: "rotate(180deg)",
                                }}
                            >
                                <span className="text-sm font-semibold tracking-wide">
                                    STORAGE
                                </span>
                            </div>


                            {/* ==================================================
                  OFFICE SPACE
              ================================================== */}

                            <div
                                className="absolute bg-white border border-gray-400 flex items-center justify-center"
                                style={{
                                    left: 225,
                                    bottom: 0,
                                    width: 405,
                                    height: 170,
                                }}
                            >
                                <span className="text-xl tracking-wide">
                                    OFFICE SPACE
                                </span>
                            </div>


                            {/* ==================================================
                  PRODUCT LOCATION PIN
              ================================================== */}

                            {targetPosition && (
                                <ProductMarker
                                    productName={productName || "-"}
                                    position={targetPosition}
                                    level={location?.level}
                                />
                            )}

                        </div>

                    </div>


                    {/* ========================================================
              ZOOM CONTROLS
          ======================================================== */}

                    <div className="absolute left-5 bottom-5 flex flex-col bg-white rounded-xl shadow-lg overflow-hidden border">

                        <button
                            onClick={(event) => {
                                event.stopPropagation();
                                zoomIn();
                            }}
                            className="w-11 h-11 text-xl hover:bg-gray-100 transition"
                        >
                            +
                        </button>

                        <div className="h-px bg-gray-200" />

                        <button
                            onClick={(event) => {
                                event.stopPropagation();
                                zoomOut();
                            }}
                            className="w-11 h-11 text-xl hover:bg-gray-100 transition"
                        >
                            −
                        </button>

                        <div className="h-px bg-gray-200" />

                        <button
                            onClick={(event) => {
                                event.stopPropagation();
                                resetView();
                            }}
                            className="w-11 h-11 text-xs hover:bg-gray-100 transition"
                            title="Reset map"
                        >
                            ⌂
                        </button>

                    </div>

                </div>


                {/* ============================================================
            FOOTER
        ============================================================ */}

                <div className="p-2 flex items-center justify-between shrink-0">

                    <div className="flex items-center gap-2">

                        <div className="w-6 h-6 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.7)]" />

                        <span className="text-sm text-gray-600">
                            Product location
                        </span>

                    </div>


                    <div className="flex items-center gap-2">

                        <span className="text-sm text-gray-500">
                            {targetAisle && targetBay
                                ? `Aisle ${targetAisle} • Bay ${targetBay} • Level ${location?.level ?? "—"}`
                                : "No product location selected"}
                        </span>
                    </div>

                </div>

            </div>

        </div>
    );
}


/*
|--------------------------------------------------------------------------
| Warehouse Row
|--------------------------------------------------------------------------
*/

function WarehouseRow({
    aisle,
    bays,
    x,
    y,
    width,
    height,
    onBayClick,
    targetAisle,
    targetBay,
}: {
    aisle: string;
    bays: string[];
    x: number;
    y: number;
    width: number;
    height: number;
    onBayClick: (aisle: string, bay: string) => void;
    targetAisle?: string;
    targetBay?: string;
}) {
    return (
        <div
            className="absolute flex"
            style={{
                left: x,
                top: y,
                width,
                height,
            }}
        >

            {bays.map((bay) => {

                const isTarget =
                    targetAisle === aisle &&
                    targetBay === bay;

                return (
                    <button
                        key={bay}
                        onClick={(event) => {
                            event.stopPropagation();
                            onBayClick(aisle, bay);
                        }}
                        className={`
              flex-1
              bg-gray-400
              border-r-2
              
              flex
              items-center
              justify-center
              text-lg
              font-medium
              transition-all
              relative
              ${isTarget
                                ? "bg-green-500 hover:bg-green-800 border-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.9)] z-20 scale-110"
                                : "hover:bg-orange-300 border-black"
                            }
            `}
                    >

                        {bay}

                    </button>
                );
            })}

        </div>
    );
}


/*
|--------------------------------------------------------------------------
| Paired warehouse rows
|--------------------------------------------------------------------------
*/

function WarehousePair({
    topAisle,
    bottomAisle,
    x,
    y,
    width,
    rowHeight,
    onBayClick,
    targetAisle,
    targetBay,
}: {
    topAisle: string;
    bottomAisle: string;
    x: number;
    y: number;
    width: number;
    rowHeight: number;
    onBayClick: (aisle: string, bay: string) => void;
    targetAisle?: string;
    targetBay?: string;
}) {
    return (
        <div
            className="absolute"
            style={{
                left: x,
                top: y,
                width,
            }}
        >

            <WarehouseRow
                aisle={topAisle}
                bays={AISLES_2_TO_7_BAYS}
                x={0}
                y={0}
                width={width}
                height={rowHeight}
                onBayClick={onBayClick}
                targetAisle={targetAisle}
                targetBay={targetBay}
            />

            <WarehouseRow
                aisle={bottomAisle}
                bays={AISLES_2_TO_7_BAYS}
                x={0}
                y={rowHeight}
                width={width}
                height={rowHeight}
                onBayClick={onBayClick}
                targetAisle={targetAisle}
                targetBay={targetBay}
            />

        </div>
    );
}


/*
|--------------------------------------------------------------------------
| Aisle label
|--------------------------------------------------------------------------
*/

function AisleLabel({
    aisle,
    x,
    y,
}: {
    aisle: string;
    x: number;
    y: number;
}) {
    return (
        <div
            className="absolute text-lg font-medium text-gray-800"
            style={{
                left: x,
                top: y,
            }}
        >
            Aisle {aisle}
        </div>
    );
}


/*
|--------------------------------------------------------------------------
| Location badge
|--------------------------------------------------------------------------
*/

function LocationBadge({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="bg-white/70 rounded-lg px-4 py-2 min-w-[75px] text-center">

            <div className="text-[10px] uppercase tracking-wide text-gray-500">
                {label}
            </div>

            <div className="font-semibold text-lg">
                {value}
            </div>

        </div>
    );
}


/*
|--------------------------------------------------------------------------
| Calculate bay coordinates
|--------------------------------------------------------------------------
*/

function getBayPosition(
    aisle: string,
    bay: string
): BayPosition | null {

    /*
    |--------------------------------------------------------------------------
    | Aisle 1
    |--------------------------------------------------------------------------
    */

    if (aisle === "1") {

        const index = AISLE_1_BAYS.indexOf(bay);

        if (index === -1) return null;

        const width = 540 / AISLE_1_BAYS.length;

        return {
            aisle,
            bay,
            x: 220 + index * width,
            y: 55,
            width,
            height: 32,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Aisles 2–7
    |--------------------------------------------------------------------------
    */

    if (["2", "3", "4", "5", "6", "7"].includes(aisle)) {

        const index = AISLES_2_TO_7_BAYS.indexOf(bay);

        if (index === -1) return null;

        const width = 660 / AISLES_2_TO_7_BAYS.length;

        const aisleY: Record<string, number> = {
            "2": 160,
            "3": 192,
            "4": 300,
            "5": 332,
            "6": 440,
            "7": 472,
        };

        return {
            aisle,
            bay,
            x: 160 + index * width,
            y: aisleY[aisle],
            width,
            height: 32,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | Aisle 8
    |--------------------------------------------------------------------------
    */

    if (aisle === "8") {

        const index = AISLE_8_BAYS.indexOf(bay);

        if (index === -1) return null;

        return {
            aisle,
            bay,
            x: 20,
            y: 515 + index * 60,
            width: 45,
            height: 60,
        };
    }


    return null;
}


/*
|--------------------------------------------------------------------------
| Product marker positioned over target bay
|--------------------------------------------------------------------------
*/

function ProductMarker({
    productName,
    position,
    level,
}: {
    productName: string;
    position: BayPosition;
    level?: string | number;
}) {
    return (
        <div
            className="absolute z-50 pointer-events-none"
            style={{
                left: position.x + position.width / 2,
                top: position.y - 40,
                transform: "translateX(-50%)",
            }}
        >

            <div className="flex flex-col items-center">

                <div className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg whitespace-nowrap">
                    {productName}
                    {level !== undefined && (
                        <span className="ml-1 opacity-80">
                            • Level {level}
                        </span>
                    )}
                </div>

                <div className="w-0 h-0 border-l-[7px] border-r-[7px] border-t-[9px] border-l-transparent border-r-transparent border-t-green-600" />

            </div>

        </div>
    );
}