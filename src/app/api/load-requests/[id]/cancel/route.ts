import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import LoadRequest from "@/models/LoadRequest";
import ProductInventory from "@/models/ProductInventory";

async function getUser() {
    const session = await getServerSession(authOptions);

    if(!session?.user){
        throw new Error("Unauthorized");
    }
    return session.user;
}

export async function PATCH(
    req: Request,
    context: { params: Promise<{ id: string }>}
) {
    const mongoSession = await mongoose.startSession();
    try {
        await connectToDatabase();
        const user = await getUser();

        if (!["admin", "warehouse"].includes(user.role)) {
            return NextResponse.json({error: "Forbidden"}, {status:403});
        }

        const { id } = await context.params;

        const body = await req.json();
        const cancelReason = typeof body.cancelReason === "string"
        ? body.cancelReason.trim()
        : "";

        if (!cancelReason) {
            return NextResponse.json({error: "Cancellation reason is required"}, {status: 400});
        }

        if(!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid Load Request ID"}, {status: 400});
        }

        let cancelledLoadRequest: any = null;

        await mongoSession.withTransaction(async () => {
            const loadRequest = await LoadRequest.findById(id)
                .session(mongoSession);

                if(!loadRequest) {
                    throw new Error("LOAD_REQUEST_NOT_FOUND");
                }

                if(loadRequest.status === "cancelled") {
                    throw new Error("ALREADY_CANCELLED");
                }
                if (loadRequest.status === "delivered") {
                    throw new Error("ALREADY_DELIVERED");
                }
                if(loadRequest.status === "rejected") {
                    throw new Error("ALREADY_REJECTED");
                }

                const cancellableStatuses = [
                    "pending", "approved", "assigned", "prepared",
                ];

                if(!cancellableStatuses.includes(loadRequest.status)){
                    throw new Error("INVALID_STATUS");
                }

                const originalStatus = loadRequest.status;

                if(originalStatus === "pending") {
                    console.log(`Cancelling pending load request ${loadRequest.LRNumber}. No inventory movement required`);
                }
                if(originalStatus === "approved" || originalStatus === "assigned") {
                    for (const item of loadRequest.products) {
                        const quantity = Number(item.approvedQuantity || 0);
                        if(quantity <=0) {
                            continue;
                        }
                        const inventory = await ProductInventory.findOneAndUpdate(
                            {
                                product: item.product,
                                preSavedInventory: {
                                    $gte: quantity,
                                },
                            },
                            {
                                $inc: {
                                    preSavedInventory: -quantity,
                                    currentInventory: quantity,
                                },
                            },
                            {
                                new: true,
                                session: mongoSession
                            }
                        );

                        if(!inventory){
                            throw new Error(`INSUFFICIENT_PRESAVED:${item.product.toString()}`);
                        }
                    }
                }
                if (originalStatus === "prepared") {
                    for (const item of loadRequest.products) {
                        const quantity = Number(item.assembledQuantity || 0);
                        if(quantity <=0) continue;

                        const inventory = await ProductInventory.findOneAndUpdate({
                            product: item.product,
                            onRouteInventory: {
                                $gte: quantity,
                            },
                        },
                        {
                            $inc: {
                                onRouteInventory: -quantity,
                                currentInventory: quantity,
                            },
                        },
                        {
                            new: true,
                            session: mongoSession,
                        }
                    );
                    if(!inventory) {
                        throw new Error(`INSUFFICIENT_ON_ROUTE:${item.product.toString()}`);
                    }
                    }
                }
                loadRequest.status = "cancelled";
                loadRequest.cancelReason = cancelReason;
                loadRequest.cancelledBy = user.id;
                loadRequest.cancelledAt = new Date();
                await loadRequest.save({
                    session: mongoSession,
                });
                cancelledLoadRequest = loadRequest;
        });
        return NextResponse.json({
            success: true,
            message: "Load Request cancelled and inventory restored successfully",
            loadRequest: cancelledLoadRequest,
        });
    } catch (err: any) {
        console.error(`CANCEL LOAD REQUEST ERROR: `, err);
        if (err.message === "Unauthorized") {
            return NextResponse.json(
              {
                error: "Unauthorized",
              },
              { status: 401 }
            );
          }
      
          if (err.message === "LOAD_REQUEST_NOT_FOUND") {
            return NextResponse.json(
              {
                error: "Load request not found",
              },
              { status: 404 }
            );
          }
      
          if (err.message === "ALREADY_CANCELLED") {
            return NextResponse.json(
              {
                error:
                  "Load request has already been cancelled",
              },
              { status: 400 }
            );
          }
      
          if (err.message === "ALREADY_DELIVERED") {
            return NextResponse.json(
              {
                error:
                  "Delivered load requests cannot be cancelled",
              },
              { status: 400 }
            );
          }
      
          if (err.message === "ALREADY_REJECTED") {
            return NextResponse.json(
              {
                error:
                  "Rejected load requests cannot be cancelled",
              },
              { status: 400 }
            );
          }
      
          if (err.message === "INVALID_STATUS") {
            return NextResponse.json(
              {
                error:
                  "Load request cannot be cancelled in its current status",
              },
              { status: 400 }
            );
          }
      
          if (
            err.message?.startsWith(
              "INSUFFICIENT_PRESAVED:"
            )
          ) {
            return NextResponse.json(
              {
                error:
                  "Unable to cancel because the reserved inventory does not match the load request. No inventory changes were made.",
              },
              { status: 409 }
            );
          }
      
          if (
            err.message?.startsWith(
              "INSUFFICIENT_ON_ROUTE:"
            )
          ) {
            return NextResponse.json(
              {
                error:
                  "Unable to cancel because the on-route inventory does not match the prepared load request. No inventory changes were made.",
              },
              { status: 409 }
            );
          }
      
          return NextResponse.json(
            {
              error:
                err.message || "Server error",
            },
            { status: 500 }
          );
      
        } finally {
          await mongoSession.endSession();
        }
}