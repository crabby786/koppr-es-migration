import mongoose from "mongoose";

let Schema = mongoose.Schema;

export interface IChannel {
    country: string;
    description: string;
    longDescription: string;
    name: string;
    thumbnailUrl: string;
    blocked: boolean;
    followers: string[];
    permalinkName: string;
    tagline: string;
    user: string;
    banner: string;
    bannerLarge: string;
    isActive: boolean;
};

let channelSchema = new Schema({
    followers: { type: [Schema.Types.ObjectId], ref: 'users', required: true },
    user: { type: Schema.Types.ObjectId, required: false, ref: "users" },
    country: { type: String, required: true },
    description: { type: String, required: true },
    longDescription: { type: String, required: false, default:"" },
    name: { type: String, required: true },
    thumbnailUrl: { type: String, required: true },
    blocked: { type: Boolean, required: false, default: false },
    permalinkName: { type: String, required: true, unique: true, index: true },
    tagline: { type: String, required: true },
    banner: { type: String, required: false },
    bannerLarge: { type: String, required: false },
    isActive: { type: Boolean, required: true, default: true }
}, { timestamps: true });

export const fieldSet = {
    "_id": true,
    "description": true,
    "name": true,
    "thumbnailUrl": true,
    "coverImageUrl": true,
    "blocked": true,
    "followers": true,
    "country": true,
    "permalinkName": true
}

export default mongoose.model('channels', channelSchema);