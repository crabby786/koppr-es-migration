import mongoose from "mongoose";

let Schema = mongoose.Schema;

export interface IRecommendationFeedback {
    userPreference: string;
    media: string;
    feedback: number;
    isActive: boolean;
};

let recommendationFeedbackSchema = new Schema({
    userPreference: { type: Schema.Types.ObjectId, ref: 'user-preferences', required: true },
    media: { type: Schema.Types.ObjectId, ref: 'medias', required: true },
    feedback: { type: Number, required: true },
    isActive: { type: Boolean, required: true, default: true }
}, { timestamps: true });

interface IRecommendationFeedbackModel extends IRecommendationFeedback, mongoose.Document { }

export default mongoose.model<IRecommendationFeedbackModel>('recommendation-feedbacks', recommendationFeedbackSchema);




