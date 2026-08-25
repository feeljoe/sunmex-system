"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { DateTime } from "luxon";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { formatCurrency } from "@/utils/format";
import { useSidebar } from "@/app/components/SideBarContext";
import { RefreshButton } from "../ui/RefreshButton";
import SubmitResultModal from "../modals/SubmitResultModal";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, PieChart, Pie, Cell, Legend, YAxis } from "recharts";

// --- ICONS & FORMATTERS ---
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1', '#f43f5e'];
const formatNumber = (format: number, padStart: number) => String(format).padStart(padStart, "0");
const formatMinutes = (totalMinutes: number) => {
    if (!totalMinutes || isNaN(totalMinutes)) return "-";
    const m = Math.floor(totalMinutes);
    const s = Math.round((totalMinutes - m) * 60);
    return m === 0 ? `${s}s` : `${m}m ${s}s`;
};

const arrowDown = <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 md:size-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25 12 21m0 0-3.75-3.75M12 21V3" /></svg>;
const arrowUp = <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 md:size-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75 12 3m0 0 3.75 3.75M12 3v18" /></svg>;
const noChange = <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 md:size-6"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>;

// --- HELPER COMPONENTS ---
const ListCard = ({ title, headerRight, children, minHeight = "min-h-60" }: any) => (
    <div className="bg-white rounded-xl shadow-xl p-2 flex flex-col">
        <div className="flex justify-between items-center border-b pb-2 mb-2">
            <h3 className="font-bold">{title}</h3>
            {headerRight && <div className="flex gap-1 font-bold items-center">{headerRight}</div>}
        </div>
        <div className={`overflow-y-auto ${minHeight} max-h-82`}>
            {children}
        </div>
    </div>
);

const MetricLineCard = ({ title, current, previous, dataKey, prevDataKey, isCurrency = false, inverseTrend = false, color = "#3b82f6", chartData }: any) => {
    let rawDiff = current - previous;
    let percent = previous === 0 ? (current > 0 ? 100 : 0) : Math.round((rawDiff / previous) * 100);
    let isGood = inverseTrend ? percent <= 0 : percent >= 0;
    const sign = rawDiff > 0 ? arrowUp : rawDiff < 0 ? arrowDown : noChange;

    return (
        <div className="bg-white rounded-xl shadow-xl p-4 flex flex-col justify-between h-auto">
            <div className="flex flex-col justify-between items-start">
                <h3 className="text-gray-500 font-bold uppercase text-[14px] tracking-wider mb-1">{title}</h3>
                <div className="w-full h-40 flex">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData || []}>
                            <XAxis dataKey="displayDate" axisLine tick={{ fill: '#9ca3af' }} fontSize={9} />
                            <YAxis domain={['dataMin', 'dataMax']} tickCount={5} width={30} fontSize={9} tickLine axisLine tick={{ fill: '#9ca3af' }} tickFormatter={(val) => isCurrency ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0, notation: "compact" }).format(Math.round(val)) : new Intl.NumberFormat('en-US', { maximumFractionDigits: 0, notation: "compact" }).format(Math.round(val))} />
                            <Tooltip contentStyle={{ fontSize: '10px' }} formatter={(val: any) => isCurrency ? formatCurrency(Number(val)) : val} labelFormatter={(label) => label} cursor={{ stroke: 'rgba(0,0,0,0.1)', strokeWidth: 2 }} />
                            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={3} dot={chartData?.length === 1 ? { r: 3, fill: color } : false} activeDot={{ r: 4 }} />
                            {prevDataKey && <Line type="monotone" dataKey={prevDataKey} stroke="#9ca3af" strokeWidth={2} strokeDasharray="4 4" dot={false} activeDot={false} />}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex mt-2 justify-between w-full items-center">
                    <div className="text-xl lg:text-2xl font-bold">{isCurrency ? formatCurrency(current) : current}</div>
                    <div className={`flex gap-2 font-bold p-2 rounded-xl text-sm ${(isGood || percent === 0) ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        <span className="flex items-center">{sign} {isCurrency ? formatCurrency(Math.abs(rawDiff)) : Math.abs(rawDiff)}</span>
                        <span className="flex items-center">({Math.abs(percent)}%)</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN EXPORT ---
export default function DashboardClient({ userRole }: { userRole: string }) {
    const { sidebarOpen } = useSidebar();
    const isAdmin = userRole === "admin";

    const [viewMode, setViewMode] = useState<"all" | "vendors" | "drivers" | "warehouse">("all");

    const [fromDate, setFromDate] = useState<string>(() => DateTime.now().setZone("America/Phoenix").startOf("week").toFormat("yyyy-MM-dd"));
    const [toDate, setToDate] = useState<string>(() => DateTime.now().setZone("America/Phoenix").endOf("week").toFormat("yyyy-MM-dd"));

    const [vendorId, setVendorId] = useState("");
    const [driverId, setDriverId] = useState("");
    const [warehouseId, setWarehouseId] = useState("");

    const [limitBS, setLimitBS] = useState(15);
    const [limitRet, setLimitRet] = useState(15);
    const [limitDev, setLimitDev] = useState(15);

    // Independent Time Selectors
    const [timeVendor, setTimeVendor] = useState<string>("order");
    const [timeWarehouse, setTimeWarehouse] = useState<string>("order");
    const [timeDriver, setTimeDriver] = useState<string>("order");

    const [vendorsList, setVendorsList] = useState<any[]>([]);
    const [driversList, setDriversList] = useState<any[]>([]);
    const [warehouseList, setWarehouseList] = useState<any[]>([]);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitStatus, setSubmitStatus] = useState<"loading" | "error" | "success" | "info" | null>(null);
    const [showFilters, setShowFilters] = useState(true);

    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const handleResize = () => setIsMobile(window.innerWidth < 768);
            handleResize();
            window.addEventListener("resize", handleResize);
            return () => window.removeEventListener("resize", handleResize);
        }
    }, []);

    useEffect(() => {
        if (isAdmin) {
            fetch("/api/users?limit=100")
                .then(res => res.json())
                .then(d => {
                    if (d.items) {
                        setVendorsList(d.items.filter((u: any) => u.userRole === "vendor"));
                        setDriversList(d.items.filter((u: any) => u.userRole === "driver"));
                        setWarehouseList(d.items.filter((u: any) => u.userRole === "warehouse"));
                    }
                }).catch(console.error);
        }
    }, [isAdmin]);

    const fetchDashboard = useCallback(async () => {
        if (!fromDate || !toDate) return;
        setLoading(true);
        setSubmitStatus("loading");

        const now = DateTime.now().setZone("America/Phoenix");
        const start = DateTime.fromISO(fromDate, { zone: "America/Phoenix" }).startOf("day");
        const end = DateTime.fromISO(toDate, { zone: "America/Phoenix" }).endOf("day");
        
        const effectiveEnd = end > now ? now : end;
        const elapsedMs = effectiveEnd.diff(start).milliseconds;
        const diffDays = Math.ceil(end.diff(start, "days").days);

        let pStart, pEnd;
        // Fix for Sunday bug: Force EXACT 7 day shift for standard week comparisons
        if (diffDays <= 7) {
            pStart = start.minus({ days: 7 }); 
        } else if (diffDays <= 31) {
            pStart = start.minus({ months: 1 });
        } else {
            pStart = start.minus({ days: diffDays });
        }
        pEnd = pStart.plus({ milliseconds: elapsedMs });

        let url = `/api/dashboard?startDate=${start.toISO()}&endDate=${end.toISO()}&prevStartDate=${pStart.toISO()}&prevEndDate=${pEnd.toISO()}`;
        if (vendorId) url += `&vendorId=${vendorId}`;
        if (driverId) url += `&driverId=${driverId}`;
        if (warehouseId) url += `&warehouseId=${warehouseId}`;

        try {
            const res = await fetch(url);
            setData(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setSubmitStatus(null);
        }
    }, [fromDate, toDate, vendorId, driverId, warehouseId]);

    useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

    const groupedChartData = useMemo(() => {
        if (!data?.metrics?.chartData || !fromDate || !toDate) return [];
        const start = DateTime.fromISO(fromDate, { zone: "America/Phoenix" });
        const end = DateTime.fromISO(toDate, { zone: "America/Phoenix" });
        const diffDays = Math.floor(end.diff(start, "days").days);
        if (diffDays <= 21) return data.metrics.chartData;

        const grouped = new Map();
        data.metrics.chartData.forEach((day: any) => {
            const dateObj = DateTime.fromISO(day.date, { zone: "America/Phoenix" });
            let key = "", displayDate = "";
            if (diffDays < 60) {
                const weekStart = dateObj.startOf("week");
                key = weekStart.toISODate() || "";
                displayDate = `Week of ${weekStart.toFormat("MMM dd")}`;
            } else {
                const monthStart = dateObj.startOf("month");
                key = monthStart.toISODate() || "";
                displayDate = monthStart.toFormat("MMM yyyy");
            }
            if (!grouped.has(key)) grouped.set(key, { date: key, displayDate, revenue: 0, prevRevenue: 0, refunds: 0, prevRefunds: 0, orders: 0, prevOrders: 0 });
            const bucket = grouped.get(key);
            bucket.revenue += day.revenue || 0; bucket.prevRevenue += day.prevRevenue || 0;
            bucket.refunds += day.refunds || 0; bucket.prevRefunds += day.prevRefunds || 0;
            bucket.orders += day.orders || 0; bucket.prevOrders += day.prevOrders || 0;
        });

        return Array.from(grouped.values()).sort((a: any, b: any) => a.date.localeCompare(b.date)).map((bucket: any) => ({
            ...bucket,
            aov: bucket.orders > 0 ? bucket.revenue / bucket.orders : 0,
            prevAov: bucket.prevOrders > 0 ? bucket.prevRevenue / bucket.prevOrders : 0,
        }));
    }, [data?.metrics?.chartData, fromDate, toDate]);

    // Role-based Layout Toggles
    const isAll = viewMode === "all" && !vendorId && !driverId && !warehouseId;
    const isVendor = viewMode === "vendors" || Boolean(vendorId);
    const isDriver = viewMode === "drivers" || Boolean(driverId);
    const isWarehouse = viewMode === "warehouse" || Boolean(warehouseId);

    const showMetrics = isAll || isVendor;
    const showVendorsGrid = isAll || isVendor;
    const showWarehouseGrid = isAll || isVendor || isDriver || isWarehouse;
    const showDriversGrid = isAll || isVendor || isDriver;
    const showSalesProducts = isAll || isVendor;

    const filteredDeviations = useMemo(() => {
        let devs = data?.products?.deviations || [];
        if (isVendor && !isAll) return devs.filter((d: any) => d.reason === "returned");
        if (isDriver && !isAll) return devs.filter((d: any) => d.reason === "damaged");
        if (isWarehouse && !isAll) return devs.filter((d: any) => d.reason === "missing");
        return devs;
    }, [data?.products?.deviations, isVendor, isDriver, isWarehouse, isAll]);

    const sortedDrivers = data?.today?.byDriver ? [...data.today.byDriver].sort((a: any, b: any) => a.routeName?.localeCompare(b.routeName)) : [];
    const sortedVendors = data?.vendors ? [...data.vendors].sort((a: any, b: any) => a.routeName?.localeCompare(b.routeName)) : [];
    const activeVendors = sortedVendors.filter((v: any) => v.rev > 0);

    const getTimeDisplay = (stats: any, type: "today" | "period" | "prev", targetStr: string) => {
        if (!stats) return 0;
        if (targetStr === "order") {
            return type === "today" ? (stats.avgTimeToday || 0) : type === "period" ? (stats.avgTimePeriod || 0) : (stats.avgTimePrev || 0);
        }
        const target = Number(targetStr);
        const duration = type === "today" ? (stats.durationTodayMin || 0) : type === "period" ? (stats.durationPeriodMin || 0) : (stats.durationPrevMin || 0);
        const revenue = type === "today" ? (stats.revenueToday || 0) : type === "period" ? (stats.revenuePeriod ?? stats.rev ?? 0) : (stats.revenuePrev ?? stats.prevRev ?? 0);
        
        if (!revenue || revenue === 0) return 0;
        return (duration / revenue) * target;
    };

    const renderTrend = (c: number, p: number, inverse = false) => {
        const percent = p === 0 ? (c > 0 ? 100 : 0) : Math.round(((c - p) / p) * 100);
        const isGood = inverse ? percent <= 0 : percent >= 0;
        return <span className={`p-2 rounded font-bold flex items-center ${isGood ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {percent > 0 ? arrowUp : percent < 0 ? arrowDown : noChange} {Math.abs(percent)}%
        </span>;
    };

    const renderProductArrow = (trend: string) => {
        if (trend === "up") return <span className="text-green-500 font-bold px-1">{arrowUp}</span>;
        if (trend === "down") return <span className="text-red-500 font-bold px-1">{arrowDown}</span>;
        return <span className="text-gray-400 font-bold px-1">{noChange}</span>;
    };

    return (
        <div className={`bg-(--secondary) p-2 flex flex-col gap-3 rounded-xl shadow-xl transition-all duration-300 ${sidebarOpen ? "md:w-[89vw]" : "md:w-[96vw]"} w-[96vw] h-[75vh] md:h-[88vh] overflow-y-auto overflow-x-hidden`}>

            <div className={`flex md:justify-between md:w-full ${showFilters ? "flex-col gap-2 md:flex-row" : "w-full justify-between h-10"}`}>
                <div className="flex w-full md:w-1/3">
                    <DateRangePicker fromDate={fromDate} toDate={toDate} onChange={(f, t) => { setFromDate(f); setToDate(t); }} />
                </div>
                {showFilters && (!vendorId && !driverId && !warehouseId) && (
                    <div className="flex gap-2 p-1 bg-gray-200 rounded-xl justify-between">
                        {["all", "vendors", "drivers", "warehouse"].map(mode => (
                            <button key={mode} onClick={() => setViewMode(mode as any)} className={`px-4 py-1 font-bold rounded-lg capitalize transition-all cursor-pointer ${viewMode === mode ? "bg-white shadow-md text-blue-800" : "text-gray-500 hover:bg-gray-300"}`}>
                                {mode}
                            </button>
                        ))}
                    </div>
                )}
                {showFilters && (
                    <div className="grid grid-cols md:grid-cols-3 gap-2 md:flex md:w-1/3 md:justify-around text-sm">
                        <select value={vendorId} onChange={(e) => { setVendorId(e.target.value); setDriverId(""); setWarehouseId(""); setViewMode("vendors"); }} className="rounded-xl p-2 bg-white font-semibold outline-none shadow-sm cursor-pointer"><option value="">All Vendors</option>{vendorsList.map(v => <option key={v._id} value={v._id}>{v.firstName} {v.lastName}</option>)}</select>
                        <select value={driverId} onChange={(e) => { setDriverId(e.target.value); setVendorId(""); setWarehouseId(""); setViewMode("drivers"); }} className="rounded-xl p-2 bg-white font-semibold outline-none shadow-sm cursor-pointer"><option value="">All Drivers</option>{driversList.map(d => <option key={d._id} value={d._id}>{d.firstName} {d.lastName}</option>)}</select>
                        <select value={warehouseId} onChange={(e) => { setWarehouseId(e.target.value); setVendorId(""); setDriverId(""); setViewMode("warehouse"); }} className="rounded-xl p-2 bg-white font-semibold outline-none shadow-sm cursor-pointer"><option value="">All Warehouse</option>{warehouseList.map(w => <option key={w._id} value={w._id}>{w.firstName} {w.lastName}</option>)}</select>
                    </div>
                )}
                <div className="flex gap-2 w-full md:w-1/3 justify-end mt-2 md:mt-0">
                    <RefreshButton onRefresh={fetchDashboard} loading={loading} />
                    <button onClick={() => setShowFilters(!showFilters)} className={`cursor-pointer md:h-10 flex gap-2 p-2 ${showFilters ? "bg-yellow-400 text-yellow-900" : "bg-yellow-900 text-white"} hover:text-white hover:bg-yellow-900 rounded-xl text-xs font-bold items-center`}><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" /></svg><span>{showFilters ? "Hide Filters" : "Show Filters"}</span></button>
                </div>
            </div>

            {loading && !data ? (<div className="flex h-64 items-center justify-center font-bold text-blue-500 animate-pulse">Loading Analytics...</div>) : (
                <>
                    {/* 1. LINE GRAPHS METRICS */}
                    {showMetrics && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                            <MetricLineCard title="Total Revenue" current={data?.metrics?.sales?.current} previous={data?.metrics?.sales?.previous} dataKey="revenue" prevDataKey="prevRevenue" isCurrency color="#10b981" chartData={groupedChartData} />
                            <MetricLineCard title="Total Refunded" current={data?.metrics?.credits?.current} previous={data?.metrics?.credits?.previous} dataKey="refunds" prevDataKey="prevRefunds" isCurrency inverseTrend color="#ef4444" chartData={groupedChartData} />
                            <MetricLineCard title="Average Order Value" current={data?.metrics?.aov?.current} previous={data?.metrics?.aov?.previous} dataKey="aov" prevDataKey="prevAov" isCurrency color="#8b5cf6" chartData={groupedChartData} />
                            <MetricLineCard title="Delivered Orders" current={data?.metrics?.ordersDelivered?.current} previous={data?.metrics?.ordersDelivered?.previous} dataKey="orders" prevDataKey="prevOrders" color="#3b82f6" chartData={groupedChartData} />
                        </div>
                    )}

                    {/* 2. VENDORS GRID: Sales by Vendor, Avg Time Between Sales, Revenue Split */}
                    {showVendorsGrid && (
                        <div className={`grid grid-cols-1 gap-2 md:grid-cols-3`}>
                            <ListCard title="Sales by Vendor">
                                {sortedVendors.map((v: any) => (
                                    <div key={v._id} className="flex justify-between items-center p-2 border-b last:border-0 hover:bg-gray-100">
                                        <span className="font-bold capitalize w-full">{v.routeName} | {v.name}</span>
                                        <div className="flex flex-col md:flex-row text-right w-full">
                                            <div className="font-bold flex w-full items-center justify-between gap-1">
                                                <div className="flex justify-end w-full text-blue-700">{formatCurrency(v.rev)}</div>
                                            </div>
                                            <div className="w-full flex justify-end items-center text-xs md:text-[16px]">
                                                {renderTrend(v.rev, v.prevRev)}
                                            </div>
                                            <div className="text-gray-600 w-full text-xs md:text-[16px]">
                                                {v.count} orders
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </ListCard>
                            <ListCard title="Avg Time Between Sales (Period)" headerRight={<select value={timeVendor} onChange={(e) => setTimeVendor(e.target.value)} className="bg-sky-50 text-sky-800 rounded-xl outline-none p-1 cursor-pointer font-semibold"><option value="order">Per Order</option><option value="250">Per $250</option><option value="500">Per $500</option><option value="1000">Per $1000</option></select>}>
                                {sortedVendors.map((v: any) => (
                                    <div key={`vtp-${v.name}`} className="flex flex-col p-2 border-b last:border-0 hover:bg-gray-100">
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="font-bold">{v.name}</div>
                                            <div className="font-bold text-sky-600 bg-sky-100 p-2 rounded-xl">{formatMinutes(getTimeDisplay(v, "period", timeVendor))} / {timeVendor === "order" ? "order" : `$${timeVendor}`}</div>
                                        </div>
                                        <div className="flex justify-end w-full text-xs md:text-[16px]">
                                            {getTimeDisplay(v, "prev", timeVendor) > 0 && renderTrend(getTimeDisplay(v, "period", timeVendor), getTimeDisplay(v, "prev", timeVendor), true)}
                                        </div>
                                    </div>
                                ))}
                            </ListCard>
                            <div className="bg-white rounded-xl shadow-xl p-2 flex flex-col justify-center items-center h-full min-h-[400px]">
                                <h3 className="font-bold text-md border-b pb-2 w-full text-left">Revenue Split</h3>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={activeVendors} dataKey="rev" nameKey="name" cx={isMobile ? "50%" : "55%"} cy="50%" innerRadius={isMobile ? 70 : 100} outerRadius={isMobile ? 110 : 150} paddingAngle={2}>
                                            {activeVendors.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip formatter={(value: any) => `${((Number(value) / (data?.metrics?.sales?.current || 1)) * 100).toFixed(2)}% (${formatCurrency(value)})`} />
                                        <Legend layout={isMobile ? "horizontal" : "vertical"} verticalAlign={isMobile ? "bottom" : "middle"} align={isMobile ? "center" : "right"} wrapperStyle={{ fontSize: "12px", width: isMobile ? "100%" : "30%", paddingTop: isMobile ? "20px" : "0px", paddingLeft: "0px" }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* 3. WAREHOUSE GRID: Warehouse Today, Warehouse Period, Avg Assembly Time */}
                    {showWarehouseGrid && (
                        <div className={`grid grid-cols-1 gap-2 md:grid-cols-3`}>
                            <ListCard title="Warehouse Today" headerRight={<><span className="text-orange-600 bg-orange-100 p-1 px-2 rounded-xl">Pending: {data?.warehouse?.pendingAssembly}</span><span className="text-blue-600 bg-blue-100 p-1 px-2 rounded-xl">Assembled: {data?.warehouse?.assembled}</span></>}>
                                {data?.warehouse?.byUser?.map((wh: any) => (
                                    <div key={`wt-${wh.userName}`} className="flex justify-between items-center p-2 border-b last:border-0 hover:bg-gray-100">
                                        <div className="font-bold w-full">{wh.userName}</div>
                                        <div className="flex flex-col md:flex-row justify-end md:justify-between w-full gap-2">
                                            <div className="flex font-bold justify-end md:w-1/2">
                                                <span className="bg-gray-100 p-2 text-gray-700 rounded-xl">{formatCurrency(wh.revenueToday)}</span>
                                            </div>
                                            <div className="flex font-bold justify-end">
                                                <span className="text-blue-600 bg-blue-100 p-2 rounded-xl">{formatNumber(wh.assembledToday, 2)} Assembled</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </ListCard>
                            <ListCard title="Warehouse Period">
                                {data?.warehouse?.byUser?.map((wh: any) => (
                                    <div key={`wp-${wh.userName}`} className="flex justify-between items-center p-2 border-b last:border-0 hover:bg-gray-100">
                                        <div className="font-bold w-full">{wh.userName}</div>
                                        <div className="flex flex-col md:flex-row justify-end md:justify-between w-full gap-2">
                                            <div className="flex font-bold justify-end md:w-1/2">
                                                <span className="bg-gray-100 p-2 text-gray-700 rounded-xl">{formatCurrency(wh.revenuePeriod)}</span>
                                            </div>
                                            <div className="flex font-bold justify-end">
                                                <span className="text-purple-600 bg-purple-100 p-2 rounded-xl">{formatNumber(wh.assembledPeriod, 2)} Assembled</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </ListCard>
                            <ListCard title="Avg Assembly Time (Period)" headerRight={<select value={timeWarehouse} onChange={(e) => setTimeWarehouse(e.target.value)} className="bg-indigo-50 text-indigo-800 rounded-xl outline-none p-1 cursor-pointer font-semibold"><option value="order">Per Order</option><option value="250">Per $250</option><option value="500">Per $500</option><option value="1000">Per $1000</option></select>}>
                                {data?.warehouse?.byUser?.map((wh: any) => (
                                    <div key={`wtp-${wh.userName}`} className="flex flex-col p-2 border-b last:border-0 hover:bg-gray-100">
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="font-bold">{wh.userName}</div>
                                            <div className="font-bold text-indigo-600 bg-indigo-100 p-2 rounded-xl">{formatMinutes(getTimeDisplay(wh, "period", timeWarehouse))} / {timeWarehouse === "order" ? "order" : `$${timeWarehouse}`}</div>
                                        </div>
                                        <div className="flex justify-end w-full text-xs md:text-[16px]">
                                            {getTimeDisplay(wh, "prev", timeWarehouse) > 0 && renderTrend(getTimeDisplay(wh, "period", timeWarehouse), getTimeDisplay(wh, "prev", timeWarehouse), true)}
                                        </div>
                                    </div>
                                ))}
                            </ListCard>
                        </div>
                    )}

                    {/* 4. DRIVERS GRID: Driver Today, Driver Period, Avg Drive Time */}
                    {showDriversGrid && (
                        <div className={`grid grid-cols-1 gap-2 md:grid-cols-3`}>
                            <ListCard title="Driver Today" headerRight={<><span className="text-blue-600 bg-blue-100 px-2 py-1 rounded-xl">Route: {data?.today?.totalOnRoute}</span><span className="text-green-600 bg-green-100 px-2 py-1 rounded-xl">Delivered: {data?.today?.totalDeliveredToday}</span></>}>
                                {sortedDrivers.map((driver: any) => (
                                    <div key={`dt-${driver.routeName}`} className="flex flex-col p-2 border-b last:border-0 hover:bg-gray-100">
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="font-bold w-full">{driver.routeName} | {driver.driverName}</div>
                                            <div className="flex justify-between w-full">
                                                <div className="flex font-bold justify-end w-1/2 text-gray-700 bg-gray-100 p-2 rounded">{formatCurrency(driver.revenueToday)}</div>
                                                <div className="flex gap-4 justify-end items-center w-full">
                                                    <div className="font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-xl">{formatNumber(driver.onRoute, 2)} </div>
                                                    <div className="font-bold text-green-600 bg-green-50 px-2 py-1 rounded-xl">{formatNumber(driver.deliveredToday, 2)} </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </ListCard>
                            <ListCard title="Driver Period">
                                {sortedDrivers.map((driver: any) => (
                                    <div key={`dp-${driver.routeName}`} className="flex justify-between items-center p-2 border-b last:border-0 hover:bg-gray-100">
                                        <div className="font-bold w-full">{driver.routeName} | {driver.driverName}</div>
                                        <div className="flex flex-col md:flex-row justify-end md:justify-between w-full gap-2">
                                            <div className="flex md:w-1/2 font-bold justify-end">
                                                <span className="bg-gray-100 p-2 text-gray-700 rounded-xl">{formatCurrency(driver.revenuePeriod)}</span>
                                            </div>
                                            <div className="flex font-bold justify-end">
                                                <span className="text-purple-600 bg-purple-100 p-2 rounded-xl">{formatNumber(driver.deliveredPeriod, 2)} Delivered</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </ListCard>
                            <ListCard title="Avg Drive Time (Period)" headerRight={<select value={timeDriver} onChange={(e) => setTimeDriver(e.target.value)} className="bg-orange-50 text-orange-800 rounded-xl outline-none p-1 cursor-pointer font-semibold"><option value="order">Per Stop</option><option value="250">Per $250</option><option value="500">Per $500</option><option value="1000">Per $1000</option></select>}>
                                {sortedDrivers.map((driver: any) => (
                                    <div key={`dtp-${driver.routeName}`} className="flex flex-col p-2 border-b last:border-0 hover:bg-gray-100">
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="font-bold">{driver.driverName}</div>
                                            <div className="font-bold text-orange-600 bg-orange-100 p-2 rounded-xl">{formatMinutes(getTimeDisplay(driver, "period", timeDriver))} / {timeDriver === "order" ? "stop" : `$${timeDriver}`}</div>
                                        </div>
                                        <div className="flex justify-end w-full text-xs md:text-[16px]">
                                            {getTimeDisplay(driver, "prev", timeDriver) > 0 && renderTrend(getTimeDisplay(driver, "period", timeDriver), getTimeDisplay(driver, "prev", timeDriver), true)}
                                        </div>
                                    </div>
                                ))}
                            </ListCard>
                        </div>
                    )}

                    {/* 5. PRODUCTS GRID: Best Sellers, Most Returned, Deviations */}
                    <div className={`grid grid-cols-1 gap-2 ${showSalesProducts ? "md:grid-cols-3" : "md:grid-cols-1"}`}>
                        {showSalesProducts && (
                            <>
                                <ListCard title="Best Sellers" headerRight={<select value={limitBS} onChange={(e) => setLimitBS(Number(e.target.value))} className="bg-green-50 text-green-800 rounded-xl outline-none p-1 cursor-pointer font-semibold"><option value="10">Top 10</option><option value="15">Top 15</option><option value="20">Top 20</option><option value="50">Top 50</option></select>} minHeight="min-h-96">
                                    {data?.products?.bestSellers?.slice(0, limitBS).map((p: any, i: number) => (
                                        <div key={p.sku} className="flex justify-between items-center py-2 border-b last:border-0 hover:bg-gray-100">
                                            <div className="flex items-center gap-1 min-w-0 pr-2">
                                                <span className="font-mono font-bold text-gray-400 w-5 flex-shrink-0">{i + 1}.</span>
                                                {renderProductArrow(p.trend)}
                                                <div className="ml-1">
                                                    <div className="font-bold capitalize text-sm md:text-[16px]">
                                                        {p.brandName?.toLowerCase()} {p.name?.toLowerCase()} {p.weight}{p.unit?.toUpperCase()}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols md:flex md:flex-nowrap justify-end gap-1.5 font-bold text-sm md:text-[16px] whitespace-nowrap">
                                                <span className="bg-green-100 text-green-800 p-1.5 px-2 rounded-xl">
                                                    {p.qty} Units
                                                </span>
                                                <span className="bg-green-100 text-green-800 p-1.5 px-2 rounded-xl">
                                                    {formatCurrency(p.rev)}
                                                </span>
                                                <span className="bg-green-100 text-green-800 p-1.5 px-2 rounded-xl">
                                                    ≈ {Math.round(p.qty / (p.caseSize || 1))} Cases
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </ListCard>
                                <ListCard title="Most Returned" headerRight={<select value={limitRet} onChange={(e) => setLimitRet(Number(e.target.value))} className="bg-red-50 text-red-800 rounded-xl outline-none p-1 cursor-pointer font-semibold"><option value="10">Top 10</option><option value="15">Top 15</option><option value="20">Top 20</option><option value="50">Top 50</option></select>} minHeight="min-h-96">
                                    {data?.products?.mostReturned?.slice(0, limitRet).map((p: any, i: number) => (
                                        <div key={p.sku} className="flex justify-between items-center py-2 border-b last:border-0 hover:bg-red-50">
                                            <div className="flex items-center gap-1 min-w-0 pr-2">
                                                <span className="font-mono font-bold text-gray-400 w-5 flex-shrink-0">{i + 1}.</span>
                                                {renderProductArrow(p.trend)}
                                                <div className="ml-1">
                                                    <div className="font-bold capitalize text-sm md:text-[16px]">
                                                        {p.brandName?.toLowerCase()} {p.name?.toLowerCase()} {p.weight}{p.unit?.toUpperCase()}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols md:flex md:flex-nowrap justify-end gap-1.5 font-bold text-sm md:text-[16px] whitespace-nowrap">
                                                <span className="bg-red-100 text-red-800 p-1.5 px-2 rounded-xl">
                                                    {p.totalReturned} Units
                                                </span>
                                                <span className="bg-red-100 text-red-800 p-1.5 px-2 rounded-xl">
                                                    {formatCurrency(p.rev)}
                                                </span>
                                                <span className="bg-red-100 text-red-800 p-1.5 px-2 rounded-xl">
                                                    ≈ {Math.round(p.totalReturned / (p.caseSize || 1))} Cases
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </ListCard>
                            </>
                        )}
                        <ListCard title="Deviations" headerRight={<select value={limitDev} onChange={(e) => setLimitDev(Number(e.target.value))} className="bg-orange-50 text-orange-800 rounded-xl outline-none p-1 cursor-pointer font-semibold"><option value="10">Top 10</option><option value="15">Top 15</option><option value="20">Top 20</option><option value="50">Top 50</option></select>} minHeight="min-h-96">
                            {filteredDeviations.slice(0, limitDev).map((p: any, i: number) => (
                                <div key={`${p.sku}-${p.reason}`} className="flex justify-between items-center py-2 border-b last:border-0 hover:bg-orange-50">
                                    <div className="flex items-center gap-1 min-w-0 pr-2">
                                        <span className="font-mono font-bold text-gray-400 w-5 flex-shrink-0">{i + 1}.</span>
                                        {renderProductArrow(p.trend)}
                                        <div className="ml-1">
                                            <div className="font-bold capitalize text-sm md:text-[16px]">
                                                {p.brandName?.toLowerCase()} {p.name?.toLowerCase()} {p.weight}{p.unit?.toUpperCase()}
                                            </div>
                                            <div className="text-xs md:text-[11px] uppercase font-bold text-orange-500">
                                                {p.reason}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols md:flex md:flex-nowrap justify-end gap-1.5 font-bold text-sm md:text-[16px] whitespace-nowrap">
                                        <span className="bg-orange-100 text-orange-800 p-1.5 px-2 rounded-xl">
                                            {p.totalDeviations} Units
                                        </span>
                                        <span className="bg-orange-100 text-orange-800 p-1.5 px-2 rounded-xl">
                                            {formatCurrency(p.totalDeviations * (p.unitPrice || 0))}
                                        </span>
                                        <span className="bg-orange-100 text-orange-800 p-1.5 px-2 rounded-xl">
                                            ≈ {Math.round(p.totalDeviations / (p.caseSize || 1))} Cases
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </ListCard>
                    </div>
                </>
            )}
            {submitStatus && <SubmitResultModal status={submitStatus} onClose={() => setSubmitStatus(null)} collection="Dashboard" />}
        </div>
    );
}