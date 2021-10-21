import mongoose from "mongoose";

let Schema = mongoose.Schema;

export interface IUserPreference {
    following: string[];
    love: string[];
    hot: string[];
    smile: string[];
    sad: string[];
    angry: string[];
    bookmarks: string[];
    interests: string[];
    isActive: boolean;
};

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

export default mongoose.model('user-preferences', userPreferenceSchema);
