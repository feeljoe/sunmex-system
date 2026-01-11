import mongoose, {Schema, Document} from 'mongoose';

export interface ILine extends Document {
    name: String;
}

const LineSchema = new Schema<ILine>({
    name: {type: String, required: true, unique: true }
}, {timestamps:true});

export default mongoose.models.Line || mongoose.model<ILine>("Line", LineSchema);