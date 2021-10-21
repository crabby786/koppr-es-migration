"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
let Schema = mongoose_1.default.Schema;
;
let interestSchema = new Schema({
    name: { type: String, required: true },
    permalinkName: { type: String, required: true, unique: true, index: true },
    thumbnailUrl: { type: String, required: false },
    longDescription: { type: String, required: false, default: "" },
    description: { type: String, required: false, default: "" },
    isActive: { type: Boolean, required: true, default: true }
}, { timestamps: true });
exports.default = mongoose_1.default.model('interests', interestSchema);
