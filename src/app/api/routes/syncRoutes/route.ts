import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db";
import Route from "@/models/Route";
import Client from "@/models/Client";

// IMPORTANT:
// Add your existing admin authentication and authorization
// to this endpoint before enabling it in production.

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();

        // REQUIRED: Enforce admin authorization here.
        // Reuse your existing server-side session/auth helper.
        // Do not allow public access to this migration.

        const body = await req.json().catch(() => ({}));

        const dryRun = body.dryRun !== false;

        const routes = await Route.find({
            type: "vendor",
        })
            .select("_id code clients")
            .lean();

        const assignments = new Map<
            string,
            { routeId: string; routeCode: string }
        >();

        const conflicts: Array<{
            clientId: string;
            routes: string[];
            reason: string;
        }> = [];

        // Build assignments from Route.clients.
        for (const route of routes) {
            const routeId = route._id.toString();

            const uniqueClientIds = new Set<string>(
                (route.clients || []).map(
                    (id: mongoose.Types.ObjectId): string => id.toString()
                )
            );

            for (const clientId of uniqueClientIds) {
                const existing = assignments.get(clientId);

                if (existing && existing.routeId !== routeId) {
                    conflicts.push({
                        clientId,
                        routes: [existing.routeCode, route.code],
                        reason: "Client belongs to multiple routes",
                    });

                    continue;
                }

                assignments.set(clientId, {
                    routeId,
                    routeCode: route.code,
                });
            }
        }

        // Stop if clients appear in multiple vendor routes.
        if (conflicts.length > 0) {
            return NextResponse.json(
                {
                    success: false,
                    dryRun,
                    message:
                        "Duplicate route assignments detected. Resolve them before syncing.",
                    conflicts,
                },
                { status: 409 }
            );
        }

        const clientIds = [...assignments.keys()];

        const clients = await Client.find({
            _id: { $in: clientIds },
        })
            .select("_id clientName routeAssigned")
            .lean();

        const clientMap = new Map(
            clients.map((client) => [
                client._id.toString(),
                client,
            ])
        );

        const updates: Array<{
            clientId: string;
            clientName: string;
            routeId: string;
            routeCode: string;
        }> = [];

        for (const [clientId, assignment] of assignments) {
            const client = clientMap.get(clientId);

            if (!client) {
                conflicts.push({
                    clientId,
                    routes: [assignment.routeCode],
                    reason: "Client does not exist",
                });

                continue;
            }

            const currentRoute = client.routeAssigned?.toString();

            if (currentRoute && currentRoute !== assignment.routeId) {
                conflicts.push({
                    clientId,
                    routes: [currentRoute, assignment.routeCode],
                    reason: "Client already points to another route",
                });

                continue;
            }

            if (currentRoute === assignment.routeId) {
                continue;
            }

            updates.push({
                clientId,
                clientName: client.clientName,
                routeId: assignment.routeId,
                routeCode: assignment.routeCode,
            });
        }

        if (dryRun || conflicts.length > 0) {
            return NextResponse.json({
                success: conflicts.length === 0,
                dryRun: true,
                totalRoutes: routes.length,
                totalAssignedClients: assignments.size,
                clientsToUpdate: updates.length,
                conflicts,
                preview: updates.slice(0, 50),
                message: conflicts.length
                    ? "Resolve conflicts before applying."
                    : "Dry run completed. No database changes made.",
            });
        }

        // =============================================
        // APPLY MIGRATION IN BATCHES
        // =============================================

        const BATCH_SIZE = 100;

        let updatedClients = 0;
        let matchedClients = 0;
        let processedBatches = 0;

        for (let i = 0; i < updates.length; i += BATCH_SIZE) {
            const batch = updates.slice(i, i + BATCH_SIZE);

            const operations = batch.map((update) => {
                const routeObjectId = new mongoose.Types.ObjectId(
                    update.routeId
                );

                return {
                    updateOne: {
                        filter: {
                            _id: new mongoose.Types.ObjectId(update.clientId),

                            // Only update clients without an assignment,
                            // or clients already assigned to this route.
                            $or: [
                                { routeAssigned: null },
                                { routeAssigned: routeObjectId },
                            ],
                        },
                        update: {
                            $set: {
                                routeAssigned: routeObjectId,
                            },
                        },
                    },
                };
            });

            const result = await Client.bulkWrite(operations, {
                ordered: true,
            });

            updatedClients += result.modifiedCount;
            matchedClients += result.matchedCount;
            processedBatches++;

            console.log(
                `Batch ${processedBatches}: ${result.modifiedCount} clients updated`
            );

            // Detect clients whose assignments changed
            // between the initial scan and this batch.
            if (result.matchedCount !== batch.length) {
                throw new Error(
                    `Batch ${processedBatches}: Expected ${batch.length} clients, ` +
                    `but matched ${result.matchedCount}. ` +
                    "Some clients may have been modified during migration. " +
                    "Review assignments before retrying."
                );
            }
        }

        console.log("CLIENT ROUTE SYNC COMPLETED:", {
            updatedClients,
            matchedClients,
            processedBatches,
        });

        return NextResponse.json({
            success: true,
            dryRun: false,
            totalRoutes: routes.length,
            totalAssignedClients: assignments.size,
            updatedClients,
            matchedClients,
            processedBatches,
            message: "Existing route assignments synchronized successfully.",
          });

    } catch (err: any) {
        console.error("SYNC EXISTING CLIENTS ERROR:", err);

        return NextResponse.json(
            {
                success: false,
                error: err.message || "Failed to synchronize clients",
            },
            { status: 500 }
        );
    }
}