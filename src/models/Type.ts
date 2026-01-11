import mongoose, {Schema, Document} from 'mongoose';

export interface IType extends Document {
    name: String;
}

const TypeSchema = new Schema<IType>({
    name: {type: String, required: true, unique: true }
}, {timestamps:true});

export default mongoose.models.Type || mongoose.model<IType>("Type", TypeSchema);