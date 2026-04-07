import mongoose, {Schema, Document} from 'mongoose';

export interface IBank extends Document {
    name: String;
    accountNumber:Number;

}

const BankSchema = new Schema<IBank>({
    name: {type: String, required: true },
    accountNumber: {type: Number, required:true, unique:true}
}, {timestamps:true});

export default mongoose.models.Bank || mongoose.model<IBank>("Bank", BankSchema);