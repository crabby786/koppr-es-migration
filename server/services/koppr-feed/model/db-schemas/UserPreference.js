"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
let Schema = mongoose_1.default.Schema;
;
let userPreferenceSchema = new Schema({
    following: { type: [Schema.Types.ObjectId], ref: "channels", required: true },
    love: { type: [Schema.Types.ObjectId], ref: "medias", required: true },
    hot: { type: [Schema.Types.ObjectId], ref: "medias", required: true },
    smile: { type: [Schema.Types.ObjectId], ref: "medias", required: true },
    sad: { type: [Schema.Types.ObjectId], ref: "medias", required: true },
    angry: { type: [Schema.Types.ObjectId], ref: "medias", required: true },
    bookmarks: { type: [Schema.Types.ObjectId], ref: "medias", required: true },
    interests: { type: [Schema.Types.ObjectId], ref: "interests", required: true },
    isActive: { type: Boolean, required: true, default: true }
}, { timestamps: true });
exports.default = mongoose_1.default.model('user-preferences', userPreferenceSchema);
