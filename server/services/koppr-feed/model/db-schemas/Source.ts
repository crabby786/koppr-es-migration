import mongoose from "mongoose";

let Schema = mongoose.Schema;

export interface ISource {

    url: string;
    type: string;
    name: string;
    ingestionActive: boolean;
    channel: any;
    lastIngestionDate: Date;
    isActive: boolean;
};

let sourceSchema = new Schema({
    url: { type: String, required: true },
    type: { type: String, required: true },
    name: { type: String, required: false },
    ingestionActive: { type: Boolean, required: false, default: false },
    channel: { type: Schema.Types.ObjectId, ref: 'channels', required: true, index: true },
    lastIngestionDate: { type: Date, required: false },
    isActive: { type: Boolean, required: true, default: true }
}, { timestamps: true });

interface ISourceModel extends ISource, mongoose.Document { }

export default mongoose.model<ISourceModel>('sources', sourceSchema);




