"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fieldSet = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
let Schema = mongoose_1.default.Schema;
;
let mediaSchema = new Schema({
    url: { type: String, required: true },
    channel: { type: Schema.Types.ObjectId, ref: 'channels', required: true },
    description: { type: String, required: false },
    longDescription: { type: String, required: false, default: "" },
    pubDate: { type: Date, required: false },
    tags: { type: Array, required: false },
    thumbnailUrl: { type: String, required: false },
    title: { type: String, required: true },
    type: { type: String, required: true },
    cleanedRawContent: { type: String, required: false },
    hashtags: { type: Array, required: false },
    sad: { type: [String], required: true },
    angry: { type: [String], required: true },
    smile: { type: [String], required: true },
    love: { type: [String], required: true },
    hot: { type: [String], required: true },
    interests: { type: [Schema.Types.ObjectId], ref: 'interests', required: false },
    blocked: { type: Boolean, required: false, default: false },
    permalinkName: { type: String, required: true, unique: true, index: true },
    isActive: { type: Boolean, required: true, default: true }
}, { timestamps: true });
exports.fieldSet = {
    "_id": 1,
    "type": 1,
    "channel": "$channel._id",
    "thumbnailUrl": 1,
    "description": 1,
    "title": 1,
    "pubDate": 1,
    "url": 1,
    "smile": 1,
    "love": 1,
    "hot": 1,
    "sad": 1,
    "angry": 1,
    "interests": 1,
    "permalinkName": 1,
    "channelThumbnailUrl": "$channel.thumbnailUrl",
    "channelName": "$channel.name",
    "channelCountry": "$channel.country",
    "channelPermalinkName": "$channel.permalinkName"
};
exports.default = mongoose_1.default.model('medias', mediaSchema);
