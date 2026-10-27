import mongoose, { ClientSession, Types } from "mongoose";
import Client from "@/models/Client";
import Route from "@/models/Route";

export class RouteAssignmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RouteAssignmentError";
  }
}

export async function syncRouteClients({
  routeId,
  clientIds,
  session,
}: {
  routeId: Types.ObjectId;
  clientIds: string[];
  session: ClientSession;
}) {
  const route = await Route.findById(routeId).session(session);

  if (!route) {
    throw new RouteAssignmentError("Route not found");
  }

  // Remove duplicate client IDs.
  const uniqueIds = [...new Set(clientIds.map(String))];

  // Validate ObjectIds.
  if (uniqueIds.some((id) => !mongoose.isValidObjectId(id))) {
    throw new RouteAssignmentError("Invalid client ID");
  }

  // Only vendor routes can have clients.
  if (route.type !== "vendor" && uniqueIds.length > 0) {
    throw new RouteAssignmentError(
      "Only vendor routes can have assigned clients"
    );
  }

  const objectIds = uniqueIds.map(
    (id) => new Types.ObjectId(id)
  );

  // Confirm all selected clients exist.
  const count = await Client.countDocuments({
    _id: { $in: objectIds },
  }).session(session);

  if (count !== objectIds.length) {
    throw new RouteAssignmentError(
      "One or more clients do not exist"
    );
  }

  // Remove these clients from other routes.
  if (objectIds.length > 0) {
    await Route.updateMany(
      {
        _id: { $ne: routeId },
        clients: { $in: objectIds },
      },
      {
        $pull: {
          clients: { $in: objectIds },
        },
      },
      { session }
    );
  }

  // Clear assignments that previously belonged to
  // this route but are no longer selected.
  await Client.updateMany(
    {
      routeAssigned: routeId,
      _id: { $nin: objectIds },
    },
    {
      $set: { routeAssigned: null },
    },
    { session }
  );

  // Assign selected clients to this route.
  if (objectIds.length > 0) {
    await Client.updateMany(
      { _id: { $in: objectIds } },
      {
        $set: { routeAssigned: routeId },
      },
      { session }
    );
  }

  // Keep Route.clients synchronized.
  await Route.updateOne(
    { _id: routeId },
    {
      $set: {
        clients: objectIds,
      },
    },
    { session }
  );

  return {
    routeId: routeId.toString(),
    assignedClients: objectIds.length,
  };
}