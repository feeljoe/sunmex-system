import mongoose, {Schema, Document} from 'mongoose';

export interface IFamily extends Document {
    name: String;
}

const FamilySchema = new Schema<IFamily>({
    name: {type: String, required: true, unique: true }
}, {timestamps:true});

export default mongoose.models.Family || mongoose.model<IFamily>("Family", FamilySchema);