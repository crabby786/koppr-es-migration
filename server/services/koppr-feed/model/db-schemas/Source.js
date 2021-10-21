"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
let Schema = mongoose_1.default.Schema;
;
let sourceSchema = new Schema({
    url: { type: String, required: true },
    type: { type: String, required: true },
    name: { type: String, required: false },
    ingestionActive: { type: Boolean, required: false, default: false },
    channel: { type: Schema.Types.ObjectId, ref: 'channels', required: true, index: true },
    lastIngestionDate: { type: Date, required: false },
    isActive: { type: Boolean, required: true, default: true }
}, { timestamps: true });
exports.default = mongoose_1.default.model('sources', sourceSchema);
