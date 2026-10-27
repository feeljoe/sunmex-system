import { NextRequest, NextResponse } from "next/server";
import { DateTime } from "luxon";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { getUser } from "@/lib/getUser";
import PreOrder from "@/models/PreOrder";
import CompanySettings from "@/models/CompanySettings";
import DeliveryPlan from "@/models/DeliveryPlan";
import DeliveryPlanStop from "@/models/DeliveryPlanStop";
import "@/models/Route";
import { optimizeDailyDeliveries, DeliveryGroup } from "@/lib/routePlanning/dailyDeliveryOptimizer";

const PHOENIX_TIMEZONE = "America/Phoenix";

const VALID_INVENTORY_LOCATIONS = new Set([
    "phoenix", "yuma", "tucson", "elPaso", "lasVegas",
]);
interface GroupedClientData {
    client: any;
    orders: {
        preorder: mongoose.Types.ObjectId;
        number: string;
        subtotal: number;
    }[];
    subtotal: number;
}

function buildCompanyAddress(settings: any) {
    return {
        street: settings.address?.street ?? "",
        street2: settings.address?.street2 ?? "",
        city: settings.address?.city ?? "",
        state: settings.address?.state ?? "",
        zipCode: settings.address?.zipCode ?? "",
        country: settings.address?.country ?? "USA",
    };
}

function buildClientAddress(client: any) {
    return {
        addressLine:
            client.billingAddress?.addressLine ?? "",

        city:
            client.billingAddress?.city ?? "",

        state:
            client.billingAddress?.state ?? "",

        country:
            client.billingAddress?.country ?? "",

        zipCode:
            client.billingAddress?.zipCode ?? "",
    };
}

export async function POST(req: NextRequest) {
    let createdPlanId:
        | mongoose.Types.ObjectId
        | null = null;

    try {
        await connectToDatabase();
        const user = await getUser(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (user.role !== "admin") {
            return NextResponse.json({ error: "Only administrators can generate delivery plans." }, { status: 403 });
        }
        const body = await req.json();
        const {
            name, deliveryDate, inventoryLocation = "phoenix", maxOrdersPerRoute,
        } = body;
        if (!deliveryDate) {
            return NextResponse.json({ error: "deliveryDate is required." }, { status: 400 });
        }
        const parsedDeliveryDate = DateTime.fromISO(String(deliveryDate), { zone: PHOENIX_TIMEZONE, });
        if (!parsedDeliveryDate.isValid) {
            return NextResponse.json({ error: "deliveryDate must be a valid ISO date." }, { status: 400 });
        }
        const normalizedDeliveryDate = parsedDeliveryDate.startOf("day").toJSDate();
        const maxOrders = Number(maxOrdersPerRoute);
        if (!Number.isInteger(maxOrders) || maxOrders < 1) {
            return NextResponse.json({ error: "maxOrdersPerRoute must be a positive integer." }, { status: 400 });
        }
        if (!VALID_INVENTORY_LOCATIONS.has(inventoryLocation)) {
            return NextResponse.json({ error: "Invalid inventoryLocation." }, { status: 400 });
        }
        const companySettings = await CompanySettings.findOne({ key: "main" }).lean();

        if (!companySettings) {
            return NextResponse.json({ error: "Company settings could not be found" }, { status: 400 });
        }
        const companyAddress = buildCompanyAddress(companySettings);

        const depotCoordinates = {
            latitude: companySettings.geoLocation?.latitude,
            longitude: companySettings.geoLocation?.longitude,
            formattedAddress: companySettings.geoLocation?.formattedAddress ?? "",
            geocodedAt: companySettings.geoLocation?.geocodedAt,
            geocodeStatus: companySettings.geoLocation?.geocodeStatus ?? "pending",
        };

        const pendingPreorders = await PreOrder.find({
            status: "pending",
            inventoryLocation,
        })
            .populate({
                path: "client",
                select: [
                    "clientNumber",
                    "clientName",
                    "billingAddress",
                    "routeAssigned",
                    "frequency",
                    "visitingDays",
                ].join(" "),
                populate: {
                    path: "routeAssigned",
                    select: "code",
                },
            }).sort({ createdAt: 1 }).lean();

        if (!pendingPreorders.length) {
            return NextResponse.json({ error: "There are not pending preorders to plan." }, { status: 400 });
        }
        const groupedClients = new Map<string, GroupedClientData>();
        const invalidOrders: {
            preorderId: string;
            number: string;
            reason: string;
        }[] = [];

        for (const preorder of pendingPreorders as any[]) {
            const client = preorder.client as any;
            if (!client?._id) {
                invalidOrders.push({ preorderId: preorder._id.toString(), number: preorder.number, reason: "Preorder has no valid client reference." });
                continue;
            }
            const clientId = client._id.toString();
            if (!groupedClients.has(clientId)) {
                groupedClients.set(
                    clientId,
                    {
                        client,
                        orders: [],
                        subtotal: 0,
                    }
                );
            }
            const group = groupedClients.get(clientId)!;
            const subtotal = Number(preorder.subtotal ?? 0);
            group.orders.push({
                preorder: preorder._id,
                number: preorder.number,
                subtotal: Number.isFinite(subtotal) ? subtotal : 0,
            });
            group.subtotal += Number.isFinite(subtotal) ? subtotal : 0;
        }
        if (invalidOrders.length > 0) {
            return NextResponse.json({ error: "Some pending preorders have invalid client references.", invalidOrders }, { status: 400 });
        }
        if (groupedClients.size === 0) {
            return NextResponse.json({ error: "No valid delivery stops could be generated." }, { status: 400 });
        }
        const oversizedStops = Array.from(groupedClients.entries()).filter(([, group]) => group.orders.length > maxOrders).map(([clientId, group]) => ({
            clientId,
            clientNumber: group.client.clientNumber,
            clientName: group.client.clientName,
            orderCount: group.orders.length,
            maxOrdersPerRoute: maxOrders,
            orders: group.orders.map((order) => order.number),
        }));
        if (oversizedStops.length > 0) {
            return NextResponse.json({ error: "One or more clients have more pending orders than a single route can contain.", message: "All orders for the same client must stay together, so increase maxOrdersPerRoute or resolve these orders before generating the plan.", conflicts: oversizedStops }, { status: 400 });
        }
        const optimizerInput: DeliveryGroup[] = Array.from(groupedClients.entries()).map(([clientId, group]) => ({
            clientId,
            orderCount: group.orders.length,
            subtotal: Number(group.subtotal.toFixed(2)),
        })
        );
        let optimizationResult;
        try {
            optimizationResult = optimizeDailyDeliveries(optimizerInput, maxOrders);
        } catch (error: any) {
            console.error("Delivery Optimizer Error: ", error);
            return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to generate valid delivery plan." }, { status: 400 });
        }
        if (optimizationResult.routeCount < 1) {
            return NextResponse.json({ error: "The optimizer did not create any routes." }, { status: 400 });
        }

        const routeSummaries = optimizationResult.bins.map((bin) => ({
            slotKey: bin.slotKey,
            route: null,
            orderCount: bin.orderCount,
            stopCount: bin.groups.length,
            subtotal: Number(bin.subtotal.toFixed(2)),
            targetSubtotal: Number(optimizationResult.targetSubtotal.toFixed(2)),
            subtotalVariance: Number((bin.subtotal - optimizationResult.targetSubtotal).toFixed(2)),
            estimatedDistanceMiles: 0,
            estimatedDriveMinutes: 0,
        }));
        const sourceOrderCount = pendingPreorders.length;
        const optimizedOrderCount = optimizationResult.bins.reduce((sum, bin) => sum + bin.orderCount, 0);
        if (optimizedOrderCount !== sourceOrderCount) {
            throw new Error(`Delivery optimizer order mismatch. Source: ${sourceOrderCount}, Optimized: ${optimizedOrderCount}.`);
        }
        const optimizedStopCount = optimizationResult.bins.reduce((sum, bin) => sum + bin.groups.length, 0);
        if (optimizedStopCount !== groupedClients.size) {
            throw new Error(`Delivery optimizer stop mismatch. Source: ${groupedClients.size} Optimized: ${optimizedStopCount}.`);
        }

        const planName = name?.trim() || `Delivery Plan -${parsedDeliveryDate.toFormat("MM/dd/yyyy")}`;
        const plan = await DeliveryPlan.create({
            name: planName,
            deliveryDate: normalizedDeliveryDate,
            inventoryLocation,
            status: "calculating",
            depot: {
                companySettings: companySettings._id,
                companyName: companySettings.companyName ?? "",
                address: companyAddress,
                coordinates: depotCoordinates,
            },
            settings: {
                maxOrdersPerRoute: maxOrders,
                balanceBy: "subtotal",
                startAtDepot: true,
                returnToDepot: true,
            },
            totals: {
                orderCount: optimizationResult.totalOrders,
                stopCount: groupedClients.size,
                subtotal: Number(optimizationResult.totalSubtotal.toFixed(2)),
                requiredRouteCount: optimizationResult.routeCount,
                targetSubtotalPerRoute: Number(optimizationResult.targetSubtotal.toFixed(2)),
            },
            routeSummaries,
            sourceSnapshotAt: new Date(),
            createdBy: user.id,
        });
        createdPlanId = plan._id;

        const stopDocuments: any[] = [];
        for (const bin of optimizationResult.bins) {
            for (const optimizerGroup of bin.groups) {
                const group = groupedClients.get(optimizerGroup.clientId);
                if (!group) {
                    throw new Error(`Grouped client ${optimizerGroup.clientId} disappeared during plan generation.`);
                }
                const client = group.client;
                const normalRoute = client.routeAssigned && typeof client.routeAssigned === "object" ? client.routeAssigned : null;
                stopDocuments.push({
                    plan: plan._id,
                    client: client._id,
                    clientSnapshot: {
                        clientNumber: client.clientNumber ?? "",
                        clientName: client.clientName ?? "",
                        address: buildClientAddress(client),
                        normalRouteCode: normalRoute?.code ?? "",
                    },
                    orders: group.orders
                            .map((order) => ({
                                preorder: order.preorder,
                                number: order.number,
                                subtotal: order.subtotal,
                            })
                        ),
                    orderCount: group.orders.length,
                    subtotal: Number(group.subtotal.toFixed(2)),
                    slotKey: bin.slotKey,
                    stopOrder: null,
                    locked: false,
                    coordinates: {
                        status: "pending",
                    },
                });
            }
        }
        const CHUNK_SIZE = 500;
        for(let i=0; i < stopDocuments.length; i += CHUNK_SIZE) {
            const chunk = stopDocuments.slice(i, i + CHUNK_SIZE);
            await DeliveryPlanStop.insertMany(chunk, {ordered: false});
        }

        const finishedPlan = await DeliveryPlan.findByIdAndUpdate(plan._id, {
            $set: {
                status: "ready",
            },
        }, {
            new: true,
        }).lean();

        const breakdown = optimizationResult.bins.map((bin) => ({
          slotKey: bin.slotKey,
          orderCount: bin.orderCount,
          stopCount: bin.groups.length,
          subtotal: Number(bin.subtotal.toFixed(2)),
          targetSubtotal:Number(optimizationResult.targetSubtotal.toFixed(2)),
          variance: Number((bin.subtotal - optimizationResult.targetSubtotal).toFixed(2)),
          stops: bin.groups.map((optimizerGroup) => {
                const group = groupedClients.get(optimizerGroup.clientId)!;
                return {
                  clientId: optimizerGroup.clientId,
                  clientNumber: group.client.clientNumber,
                  clientName: group.client.clientName,
                  orderCount: group.orders.length,
                  subtotal: Number(group.subtotal.toFixed(2)),
                  orders:
                    group.orders.map((order) => ({
                        number:order.number,
                        subtotal:order.subtotal,
                      })
                    ),
                };
              }
            ),
        })
      );
      return NextResponse.json({
        success: true,
        message: "Delivery Plan generated successfully",
        plan: { 
            _id: finishedPlan?._id,
            name: finishedPlan?.name,
            deliveryDate: finishedPlan?.deliveryDate,
            inventoryLocation: finishedPlan?.inventoryLocation,
            status: finishedPlan?.status,
            totals: finishedPlan?.totals,
            depot: finishedPlan?.depot,
            source: {
                pendingOrders: pendingPreorders.length,
                deliveryStops: groupedClients.size,
                optimizedOrders: optimizationResult.totalOrders,
            },
        },
        routes: breakdown,
      }, { status: 201});
    } catch(error: any) {
        console.error("Create delivery plan error: ", error);
        if(createdPlanId) {
            await Promise.allSettled([
                DeliveryPlanStop.deleteMany({
                    plan: createdPlanId,
                }),
                DeliveryPlan.findByIdAndDelete(createdPlanId),
            ]);
        }
        return NextResponse.json({ error: "Failed to generate delivery plan.", details: error instanceof Error ? error.message : "Unknown error."}, {status: 500});
    }
}