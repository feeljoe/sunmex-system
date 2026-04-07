// /models/User.ts
import mongoose, { Schema, Document, models } from "mongoose";

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  userRole: "admin" | "vendor" | "driver" | "warehouse" | "onRoute";
  username: string;
  email: string;
  phoneNumber: string;
  password: string;
}

const UserSchema = new Schema<IUser>({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  userRole: { type: String, 
    enum: ["admin", "vendor", "driver", "warehouse", "onRoute"],
    required: true
  },
  username: { type: String, required: true, unique: true },
  email: {type: String},
  phoneNumber: {type: String},
  password: { type: String, required: true },
}, 
{ timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
