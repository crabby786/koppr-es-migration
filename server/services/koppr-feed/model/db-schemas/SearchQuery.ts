import mongoose from "mongoose";
// import { sanitizeSchema } from 'mongo-sanitize-save';

let Schema = mongoose.Schema;

export interface ISearchQuery {
    payload: any;
    type: string;
    searchQuery: string;
    user: any;
    createdAt: any;
    updatedAt: any;
    createdBy: any;
    updatedBy: any;
    isActive: boolean;
}

let Payload = new Schema({
    query: {
        type: Object,
        required: false
    },
    body: {
        type: Object,
        required: false
    },
    params: {
        type: Object,
        required: false
    }
});

let searchQuerySchema = new Schema({
    payload: {
        type: Payload,
        required: false
    },
    type: {
        type: String,
        required: false
    },
    searchQuery: {
        type: String,
        required: false
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'users',
        required: false
    },
    isActive: {
        type: Boolean,
        required: true,
        default: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'users',
        required: false
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'users',
        required: false
    }
}, { timestamps: true });

searchQuerySchema.pre('save', function (this: any, next) {
    this.createdBy = this.isNew ? this.updatedBy : this.createdBy;
    next();
});

interface ISearchQueryModel extends ISearchQuery, mongoose.Document { }
export default mongoose.model<ISearchQueryModel>('search-queries', searchQuerySchema);