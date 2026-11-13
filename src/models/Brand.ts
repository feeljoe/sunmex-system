import mongoose, {Schema, Document} from 'mongoose';

export interface IBrand extends Document {
    name: String;
    status: String;
}

const BrandSchema = new Schema<IBrand>({
    name: {type: String, required: true, unique: true },
    status: {type: String, enum:["active", "inactive"], default: "active"}
}, {timestamps:true});

export default mongoose.models.Brand || mongoose.model<IBrand>("Brand", BrandSchema);