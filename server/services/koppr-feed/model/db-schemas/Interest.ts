import mongoose from "mongoose";

let Schema = mongoose.Schema;

export interface IInterest {
    name: string;
    permalinkName: string;
    thumbnailUrl: string;
    longDescription: string;
    isActive: boolean;
};

let interestSchema = new Schema({
    name: { type: String, required: true },
    permalinkName: { type: String, required: true, unique: true, index: true },
    thumbnailUrl: { type: String, required: false }, //added
    longDescription: { type: String, required: false, default:"" },
    description: { type: String, required: false, default:"" },
    isActive: { type: Boolean, required: true, default: true }

}, { timestamps: true });

interface IInterestModel extends IInterest, mongoose.Document { }

export default mongoose.model<IInterestModel>('interests', interestSchema);




