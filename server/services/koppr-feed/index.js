"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express = __importStar(require("express"));
const Cors_1 = __importDefault(require("./Cors"));
const mongoose_1 = require("mongoose");
const controller_1 = require("./controller");
const db_schemas_1 = require("./model/db-schemas");
const router = express.Router();
router.options('*', Cors_1.default);
router.use(Cors_1.default);
const logSearchQuery = async ({ req, res, next }, { type }) => {
    var _a, _b, _c, _d;
    req.query['user'] = mongoose_1.isValidObjectId((_a = req.query) === null || _a === void 0 ? void 0 : _a.user) ? (_b = req.query) === null || _b === void 0 ? void 0 : _b.user : null;
    let data = {
        type,
        user: (_c = req.query) === null || _c === void 0 ? void 0 : _c.user,
        searchQuery: (_d = req.query) === null || _d === void 0 ? void 0 : _d.query,
        payload: {
            query: req.query,
            body: req.body,
            params: req.params
        }
    };
    let searchQuery = new db_schemas_1.SearchQuery(data);
    searchQuery = await searchQuery.save();
    next();
};
const RestAPI = new controller_1.RestController({});
router.patch('/sources/:_id', RestAPI.editSource);
router.get('/sources/:_id', RestAPI.getSourceById);
router.get('/sources', RestAPI.getSources);
router.post('/sources', RestAPI.addSource);
router.get('/channels/permalink', RestAPI.getChannelsByPermalink);
router.get('/channels', RestAPI.getChannels);
router.post('/channels', RestAPI.addChannel);
router.patch('/channels/:_id', RestAPI.editChannel);
router.get('/channels/:_id', RestAPI.getChannelInfo);
router.get('/interests/all', RestAPI.getAllInterest);
router.get('/interests/:id', RestAPI.getInterestInfo);
router.delete('/interests/:id', RestAPI.deleteInterest);
router.post('/interests', RestAPI.createInterest);
router.get('/userpref/interests', RestAPI.getFollowedInterest);
router.get('/recommendations/channels', RestAPI.getRecommendationChannels);
router.post('/userpref/channels', RestAPI.followUnfollowChannels);
router.post('/userpref/interests', RestAPI.userpreferenceInterests);
router.get('/userpref/channels', RestAPI.followedChannels);
router.get('/userpref/bookmarks', RestAPI.getBookmarks);
router.post('/userpref/bookmarks', RestAPI.userPreferencesBookmarks);
router.get('/media/recent-by-channel', RestAPI.getRecentMediaByChannel);
router.get('/media/recent-by-interest', RestAPI.getRecentMediaByInterest);
router.get('/media/recent', RestAPI.getRecentMedia);
router.post('/media/recent-new', RestAPI.getRecentMediaNew);
router.get('/media/trending-by-interest', RestAPI.getTrendingMediaByInterest);
router.get('/media/trending-by-channel', RestAPI.getTrendingMediaByChannel);
router.get('/media/trending', RestAPI.getTrendingMedia);
router.get('/media/:_id', RestAPI.getMediaByIdForFeeds);
router.get('/media', RestAPI.getMediaByInterest);
router.patch('/media/:_id', RestAPI.editMedia);
router.post('/reaction', RestAPI.updateReaction);
router.get('/getMedia', RestAPI.getMedia);
router.get('/recommendations', RestAPI.getRecommendationsNew);
router.get('/recommendations/trending', RestAPI.getRecommendationsNew);
router.put('/interests/:_id', RestAPI.editInterest);
router.get('/channel/info/:id', RestAPI.getChannelsById);
router.get('/channel/:_id', RestAPI.oldGetChannelInfo);
router.get('/search', (req, res, next) => logSearchQuery({ req, res, next }, { type: 'overall' }), RestAPI.overallSearch);
router.get('/search/medias', (req, res, next) => logSearchQuery({ req, res, next }, { type: 'media' }), RestAPI.mediaSearch);
router.get('/search/interests', (req, res, next) => logSearchQuery({ req, res, next }, { type: 'interest' }), RestAPI.interestSearch);
router.get('/search/channels', (req, res, next) => logSearchQuery({ req, res, next }, { type: 'channel' }), RestAPI.channelSearch);
router.get('/cms/medias/:_id', RestAPI.getMediaByIdForFeedsCms);
router.get('/cms/channels', RestAPI.getChannelsCms);
router.get('/cms/medias', RestAPI.getMediasCms);
router.get('/medias', RestAPI.getMediasNoAuth);
router.get('/list-medias', RestAPI.listMedias);
router.get('/cms/interests/all', RestAPI.getAllInterestCMS);
router.get('/cms/dashboard/ingested-media-stats', RestAPI.ingestedMediaStats);
router.get('/cms/dashboard/media-count-stats', RestAPI.getMediaCountStats);
router.get('/feeds/:_id', RestAPI.getMediaById);
router.get('/generateInterestsPermalink', RestAPI.generateInterestsPermalink);
router.get('/migrate/snips-permalink', RestAPI.migrateSnipsPermalink);
router.get('/snips', RestAPI.getSnips);
router.get('/snips/:_id', RestAPI.fetchSnipsById);
router.patch('/snips/:_id', RestAPI.updateSnips);
router.post('/snips', RestAPI.createSnips);
router.delete('/snips/:_id', RestAPI.deleteSnips);
exports.default = router;
