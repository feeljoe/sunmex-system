import mongoose, {Schema, Document} from 'mongoose';

export interface IType extends Document {
    name: String;
    order: number;
}

const TypeSchema = new Schema<IType>({
    name: {type: String, required: true, unique: true },
    order: { type: Number, default: 0}
}, {timestamps:true});

export default mongoose.models.Type || mongoose.model<IType>("Type", TypeSchema);