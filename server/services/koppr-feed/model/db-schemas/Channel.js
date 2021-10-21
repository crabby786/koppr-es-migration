"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fieldSet = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
let Schema = mongoose_1.default.Schema;
;
let channelSchema = new Schema({
    followers: { type: [Schema.Types.ObjectId], ref: 'users', required: true },
    user: { type: Schema.Types.ObjectId, required: false, ref: "users" },
    country: { type: String, required: true },
    description: { type: String, required: true },
    longDescription: { type: String, required: false, default: "" },
    name: { type: String, required: true },
    thumbnailUrl: { type: String, required: true },
    blocked: { type: Boolean, required: false, default: false },
    permalinkName: { type: String, required: true, unique: true, index: true },
    tagline: { type: String, required: true },
    banner: { type: String, required: false },
    bannerLarge: { type: String, required: false },
    isActive: { type: Boolean, required: true, default: true }
}, { timestamps: true });
exports.fieldSet = {
    "_id": true,
    "description": true,
    "name": true,
    "thumbnailUrl": true,
    "coverImageUrl": true,
    "blocked": true,
    "followers": true,
    "country": true,
    "permalinkName": true
};
exports.default = mongoose_1.default.model('channels', channelSchema);
