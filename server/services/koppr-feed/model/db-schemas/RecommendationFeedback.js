"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
let Schema = mongoose_1.default.Schema;
;
let recommendationFeedbackSchema = new Schema({
    userPreference: { type: Schema.Types.ObjectId, ref: 'user-preferences', required: true },
    media: { type: Schema.Types.ObjectId, ref: 'medias', required: true },
    feedback: { type: Number, required: true },
    isActive: { type: Boolean, required: true, default: true }
}, { timestamps: true });
exports.default = mongoose_1.default.model('recommendation-feedbacks', recommendationFeedbackSchema);
