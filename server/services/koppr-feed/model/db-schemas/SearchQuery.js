"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
let Schema = mongoose_1.default.Schema;
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
searchQuerySchema.pre('save', function (next) {
    this.createdBy = this.isNew ? this.updatedBy : this.createdBy;
    next();
});
exports.default = mongoose_1.default.model('search-queries', searchQuerySchema);
