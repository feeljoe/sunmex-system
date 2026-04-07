// /models/DriverRoute.ts
import mongoose, {Schema} from "mongoose";

const DriverRouteSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  clientReceipts: [{ type: Schema.Types.ObjectId, ref: "ClientReceipt" }]
}, { timestamps: true });

export default mongoose.models.DriverRoute || mongoose.model("DriverRoute", DriverRouteSchema);
