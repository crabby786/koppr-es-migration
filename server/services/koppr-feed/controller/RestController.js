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
const assert_1 = __importDefault(require("assert"));
const helper_1 = require("../../../utils/helper");
const errorFormatter_1 = __importDefault(require("../lib/errorFormatter"));
const ErrorHandler_1 = require("../../../utils/helper/ErrorHandler");
const date_fns_1 = require("date-fns");
const Media_1 = __importStar(require("../model/db-schemas/Media"));
const Channel_1 = __importStar(require("../model/db-schemas/Channel"));
const Source_1 = __importDefault(require("../model/db-schemas/Source"));
const AppConstants_1 = require("../../../lib/AppConstants");
const mongoose_1 = __importDefault(require("mongoose"));
const lodash_1 = __importDefault(require("lodash"));
const Interest_1 = __importDefault(require("../model/db-schemas/Interest"));
const UserPreference_1 = __importDefault(require("../model/db-schemas/UserPreference"));
const index_1 = require("../../../utils/helper/index");
const ESClient_1 = require("../lib/ElasticSearch/ESClient");
const ObjectId = mongoose_1.default.Types.ObjectId;
const log = helper_1.Logger.log;
class RestController {
    constructor(params) {
        this.getSourceById = async (req, res) => {
            try {
                let query = {};
                let _id = req.params._id;
                assert_1.default.ok(helper_1.validObjectIdRegex(_id), "Invalid Source Id " + _id);
                query._id = ObjectId(_id);
                let source = await Source_1.default.findOne(query).lean().exec();
                assert_1.default.ok(source, "Source not found for id :" + req.params._id);
                return res.status(200).send({ success: true, msg: null, data: source });
            }
            catch (err) {
                return res.status(400).send({ success: false, msg: errorFormatter_1.default(err) });
            }
        };
        this.getChannels = async (req, res) => {
            var _a, _b, _c;
            try {
                let { country, start, end, mediaType } = req.query;
                let query = {
                    "blocked": false
                };
                let querySource = {};
                start = Number((_a = req === null || req === void 0 ? void 0 : req.query) === null || _a === void 0 ? void 0 : _a.start) || 0;
                end = Number((_b = req === null || req === void 0 ? void 0 : req.query) === null || _b === void 0 ? void 0 : _b.end) || 10000;
                let isReqdParamsAvailable = Object.values(AppConstants_1.GET_CHANNELS_REQUIRED_PARAMS).every((k) => { return k in (req === null || req === void 0 ? void 0 : req.query); });
                assert_1.default.ok(isReqdParamsAvailable, `Invalid query string parameters. Please specify exactly these parameters: ${Object.values(AppConstants_1.GET_CHANNELS_REQUIRED_PARAMS).join(' or ')}`);
                if (mediaType) {
                    let validMediaType = (_c = Object.values(AppConstants_1.VALID_MEDIA_TYPES_FOR_INTEREST)) === null || _c === void 0 ? void 0 : _c.some(v => v === mediaType);
                    assert_1.default.ok(validMediaType, `Query string parameter <mediaType> must be one of ${Object.values(AppConstants_1.VALID_MEDIA_TYPES_FOR_INTEREST).join(' or ')}`);
                }
                mediaType === 'video' && (mediaType = "youtube");
                if (mediaType) {
                    querySource = mediaType !== 'all' ? { "sources.type": { "$eq": mediaType } } : {};
                }
                else {
                    querySource = {};
                }
                if (country) {
                    query.country = country === null || country === void 0 ? void 0 : country.toUpperCase();
                    assert_1.default.ok(country.length === 2, "Parameter country must be a valid two-digit ISO country code.");
                }
                if (start || end) {
                    assert_1.default.ok((!isNaN(start) || !isNaN(end)), "Query string parameters <start, limit> must be positive integers.");
                    assert_1.default.ok(start >= 0, "Query string parameter <skip> must be a positive integer.");
                    assert_1.default.ok(end > 0, "Query string parameter <limit> must be a non-zero positive integer.");
                }
                let sources = await this.elasticSearch({
                    type: AppConstants_1.KOPPR_SEARCH_INDEX_PREFIX.SOURCE, otherFilters: {
                        "must": [{
                                "exists": {
                                    "field": "document.channel"
                                }
                            }]
                    }, mediaType, skip: start, limit: end
                });
                let channelIds = lodash_1.default.uniqBy(sources, (s) => s === null || s === void 0 ? void 0 : s.channel).map((c) => c === null || c === void 0 ? void 0 : c.channel);
                let channels = await this.elasticSearch({
                    type: AppConstants_1.KOPPR_SEARCH_INDEX_PREFIX.CHANNEL, otherFilters: {
                        "filter": {
                            "terms": {
                                "document._id": channelIds
                            }
                        },
                        "must_not": [
                            {
                                "match": {
                                    "document.blocked": true
                                }
                            }
                        ]
                    }, skip: start, limit: end, sort: [
                        {
                            "document.createdAt": { "order": "desc" }
                        }
                    ]
                });
                channels = await Promise.all(channels.map(async (channel) => {
                    let totalPosts = await Media_1.default.count({ channel: channel === null || channel === void 0 ? void 0 : channel._id, blocked: false }).lean().exec();
                    channel['totalPosts'] = totalPosts;
                    return channel;
                }));
                return res.status(200).send({ success: true, msg: null, data: channels });
            }
            catch (err) {
                return res.status(400).send({ success: false, "msg": errorFormatter_1.default(err) });
            }
        };
        this.listMedias = async (req, res) => {
            try {
                let filters = [];
                let { start, end, fromDate, toDate, mediaType } = req.query;
                (fromDate && toDate) && filters.push({
                    "range": {
                        "document.pubDate": {
                            "gte": new Date(fromDate),
                            "lt": new Date(toDate)
                        }
                    }
                });
                let medias = await this.elasticSearch({
                    type: AppConstants_1.KOPPR_SEARCH_INDEX_PREFIX.MEDIA, otherFilters: {
                        "must": filters
                    }, limit: end || 10000, skip: start, mediaType, sort: [{
                            "document.pubDate": { "order": "desc" }
                        }]
                });
                medias = helper_1.descriptionConverter(medias);
                medias = medias || [];
                return res.status(200).send({ success: true, msg: null, data: medias });
            }
            catch (err) {
                return res.status(400).send({ success: false, msg: errorFormatter_1.default(err) });
            }
        };
        this.getMediasCms = async (req, res) => {
            try {
                let query = {};
                let { start, end, fromDate, toDate, mediaType } = req.query;
                let isValidAttributes = Object.values(AppConstants_1.GET_MEDIA_REQUIRED_ARGS).every((k) => { return k in (req === null || req === void 0 ? void 0 : req.query); });
                assert_1.default.ok(isValidAttributes, `Invalid query string parameters.Please specify exactly these parameters: ${Object.values(AppConstants_1.GET_MEDIA_REQUIRED_ARGS).join(' or ')}`);
                start = Number(start);
                end = Number(end);
                fromDate && (query.pubDate = { $gte: new Date(fromDate) });
                toDate && (query.pubDate = Object.assign(Object.assign({}, query === null || query === void 0 ? void 0 : query.pubDate), { $lte: date_fns_1.addDays(new Date(toDate), 2) }));
                query.type = mediaType === 'all' ? { "$exists": true } : { "$eq": mediaType };
                assert_1.default.ok((!isNaN(start) || !isNaN(end)), "Query string parameters <start, limit> must be positive integers.");
                assert_1.default.ok(start >= 0, "Query string parameter <skip> must be a positive integer.");
                assert_1.default.ok(end > 0, "Query string parameter <limit> must be a non-zero positive integer.");
                let media = await Media_1.default.aggregate([
                    {
                        "$match": query
                    },
                    {
                        "$sort": { "pubDate": -1 }
                    },
                    {
                        "$lookup": {
                            "from": "interests",
                            "localField": "interests",
                            "foreignField": "_id",
                            "as": "interests"
                        }
                    },
                    {
                        "$lookup": {
                            "from": "channels",
                            "localField": "channel",
                            "foreignField": "_id",
                            "as": "channel"
                        }
                    },
                    {
                        "$unwind": "$channel"
                    },
                    {
                        "$skip": start
                    },
                    {
                        "$limit": end
                    },
                    {
                        "$project": Object.assign(Object.assign({}, Media_1.fieldSet), { "tags": 1, "cleanedRawContent": 1, "hashtags": 1, "blocked": 1, "nlpDescription": 1, "authors": 1 })
                    },
                ]).allowDiskUse(true).exec();
                media = helper_1.descriptionConverter(media);
                media = media || [];
                return res.status(200).send({ success: true, msg: null, data: media });
            }
            catch (err) {
                return res.status(400).send({ success: false, msg: errorFormatter_1.default(err) });
            }
        };
        this.getMediasNoAuth = async (req, res) => {
            try {
                let query = {};
                let { start, end, fromDate, toDate, mediaType } = req.query;
                let isValidAttributes = Object.values(AppConstants_1.GET_MEDIA_REQUIRED_ARGS).every((k) => { return k in (req === null || req === void 0 ? void 0 : req.query); });
                assert_1.default.ok(isValidAttributes, `Invalid query string parameters.Please specify exactly these parameters: ${Object.values(AppConstants_1.GET_MEDIA_REQUIRED_ARGS).join(' or ')}`);
                start = Number(start);
                end = Number(end);
                fromDate && (query.pubDate = { $gte: new Date(fromDate) });
                toDate && (query.pubDate = Object.assign(Object.assign({}, query === null || query === void 0 ? void 0 : query.pubDate), { $lte: date_fns_1.addDays(new Date(toDate), 2) }));
                query.type = mediaType === 'all' ? { "$exists": true } : { "$eq": mediaType };
                assert_1.default.ok((!isNaN(start) || !isNaN(end)), "Query string parameters <start, limit> must be positive integers.");
                assert_1.default.ok(start >= 0, "Query string parameter <skip> must be a positive integer.");
                assert_1.default.ok(end > 0, "Query string parameter <limit> must be a non-zero positive integer.");
                let media = await Media_1.default.aggregate([
                    {
                        "$match": query
                    },
                    {
                        "$sort": { "pubDate": -1 }
                    },
                    {
                        "$lookup": {
                            "from": "interests",
                            "localField": "interests",
                            "foreignField": "_id",
                            "as": "interests"
                        }
                    },
                    {
                        "$lookup": {
                            "from": "channels",
                            "localField": "channel",
                            "foreignField": "_id",
                            "as": "channel"
                        }
                    },
                    {
                        "$unwind": "$channel"
                    },
                    {
                        "$skip": start
                    },
                    {
                        "$limit": end
                    },
                    {
                        "$project": Object.assign(Object.assign({}, Media_1.fieldSet), { "tags": 1, "cleanedRawContent": 1, "hashtags": 1, "blocked": 1, "nlpDescription": 1, "authors": 1 })
                    },
                ]).allowDiskUse(true).exec();
                media = helper_1.descriptionConverter(media);
                media = media || [];
                return res.status(200).send({ success: true, msg: null, data: media });
            }
            catch (err) {
                return res.status(400).send({ success: false, msg: errorFormatter_1.default(err) });
            }
        };
        this.getChannelInfo = async (req, res) => {
            var _a, _b, _c, _d;
            try {
                let { type, start, end, otherOptions } = req.query;
                let filters = [];
                assert_1.default.ok((_a = req === null || req === void 0 ? void 0 : req.params) === null || _a === void 0 ? void 0 : _a._id, "ID does not exist");
                let _id = (_b = req === null || req === void 0 ? void 0 : req.params) === null || _b === void 0 ? void 0 : _b._id;
                let query = { blocked: false };
                let isValidId = helper_1.validObjectIdRegex(_id);
                isValidId && (query._id = ObjectId((_c = req === null || req === void 0 ? void 0 : req.params) === null || _c === void 0 ? void 0 : _c._id));
                !isValidId && (query.permalinkName = (_d = req === null || req === void 0 ? void 0 : req.params) === null || _d === void 0 ? void 0 : _d._id);
                let channelExists = await Channel_1.default.exists(query);
                assert_1.default.ok(channelExists, "Channel could not be found with id :" + _id);
                start = Number(start);
                end = Number(end);
                assert_1.default.ok((!isNaN(start) || !isNaN(end)), "Query string parameters <start, limit> must be positive integers.");
                assert_1.default.ok(start >= 0, "Query string parameter <skip> must be a positive integer.");
                assert_1.default.ok(end > 0, "Query string parameter <limit> must be a non-zero positive integer.");
                let channels = await Channel_1.default.find(query).lean().exec();
                filters = [];
                let channel = lodash_1.default.first(channels);
                (channel === null || channel === void 0 ? void 0 : channel._id) && filters.push({
                    "match": {
                        "document.channel": channel === null || channel === void 0 ? void 0 : channel._id
                    }
                });
                let mustNotFilters = [];
                let medias = await this.elasticSearch({
                    type: AppConstants_1.KOPPR_SEARCH_INDEX_PREFIX.MEDIA, mediaType: type, otherFilters: {
                        "must": filters,
                        "must_not": mustNotFilters
                    }, skip: start, limit: end > 10000 ? 10000 : end,
                    sort: [{
                            "document.pubDate": { "order": "desc" }
                        }]
                });
                medias = helper_1.descriptionConverter(medias);
                channel["medias"] = medias;
                return res.status(200).send({ success: true, msg: null, data: channel });
            }
            catch (err) {
                return res.status(400).send({ success: false, "msg": errorFormatter_1.default(err) });
            }
        };
        this.getAllInterest = async (req, res) => {
            try {
                let interests;
                let { start: skip, end: limit } = req.query;
                if (skip || limit) {
                    skip = Number(skip);
                    limit = Number(limit) || 1000000;
                    assert_1.default.ok((!isNaN(skip) || !isNaN(limit)), "Query string parameters <start, limit> must be positive integers.");
                    assert_1.default.ok(skip >= 0, "Query string parameter <skip> must be a positive integer.");
                    assert_1.default.ok(skip > 0, "Query string parameter <limit> must be a non-zero positive integer.");
                }
                interests = await this.elasticSearch({ type: AppConstants_1.KOPPR_SEARCH_INDEX_PREFIX.INTEREST, skip: (skip || 0), limit: (limit || 10000) });
                interests = await Promise.all(interests.map(async (interest) => {
                    let userPreferences = await UserPreference_1.default.count({ interests: { $in: interest === null || interest === void 0 ? void 0 : interest._id } }).lean().exec();
                    interest['followersCount'] = userPreferences;
                    let totalPosts = await Media_1.default.count({ interests: { $in: interest === null || interest === void 0 ? void 0 : interest._id }, blocked: false }).lean().exec();
                    interest['totalPosts'] = totalPosts;
                    return interest;
                }));
                return res.status(200).send({ success: true, msg: null, data: interests });
            }
            catch (err) {
                return res.status(400).send({ success: false, "msg": errorFormatter_1.default(err) });
            }
        };
        this.getRecommendationChannels = async (req, res) => {
            try {
                let filters = [];
                let { country } = req.query;
                let isReqdParamsAvailable = Object.values(AppConstants_1.GET_RECOMMENDATION_CHANNELS_REQUIRED_PARAMS).every((k) => { return k in (req === null || req === void 0 ? void 0 : req.query); });
                assert_1.default.ok(isReqdParamsAvailable, `Invalid query string parameters. Please specify exactly these parameters: ${Object.values(AppConstants_1.GET_RECOMMENDATION_CHANNELS_REQUIRED_PARAMS).join(' or ')}`);
                country = country.toUpperCase();
                assert_1.default.ok(country.length === 2, "Parameter country must be a valid two-digit ISO country code.");
                let limit = 20;
                country && filters.push({
                    "match": {
                        "document.country": country
                    }
                });
                let channels = await this.elasticSearch({
                    type: AppConstants_1.KOPPR_SEARCH_INDEX_PREFIX.CHANNEL,
                    otherQueries: {
                        "function_score": {
                            query: {
                                "bool": {
                                    "must": filters
                                }
                            },
                            "boost": "5",
                            "random_score": {},
                            "boost_mode": "multiply"
                        }
                    },
                    skip: 0, limit
                });
                return res.status(200).send({
                    success: true, msg: null, data: channels || []
                });
            }
            catch (err) {
                return res.status(400).send({ success: false, "msg": errorFormatter_1.default(err) });
            }
        };
        this.followedChannels = async (req, res) => {
            var _a;
            let followedChannel;
            try {
                let { userId } = req.query;
                let isReqdParamsAvailable = Object.values(AppConstants_1.GET_USERS_FOLLOWED_INTERESTS_REQUIRED_PARAMS).every((k) => { return k in (req === null || req === void 0 ? void 0 : req.query); });
                assert_1.default.ok(isReqdParamsAvailable, "Invalid query string parameters. Please specify exactly these parameters: " + AppConstants_1.GET_USERS_FOLLOWED_INTERESTS_REQUIRED_PARAMS.USER_ID);
                assert_1.default.ok(helper_1.validObjectIdRegex(userId), "Invalid userId: " + userId);
                let userPreferenceExists = UserPreference_1.default.exists({ "_id": userId });
                assert_1.default.ok((userPreferenceExists), "[]");
                let following;
                followedChannel = await UserPreference_1.default.findOne({ "_id": userId }, { following: 1 }).lean().exec();
                ((followedChannel === null || followedChannel === void 0 ? void 0 : followedChannel.following) && ((_a = followedChannel === null || followedChannel === void 0 ? void 0 : followedChannel.following) === null || _a === void 0 ? void 0 : _a.length)) ? (following = followedChannel.following) : (following = []);
                let channels = await Channel_1.default.find({ _id: { $in: following } }, { _id: 1, name: 1, thumbnailUrl: 1 }).lean().exec();
                channels = await Promise.all(channels.map(async (channel) => {
                    let totalPosts = await Media_1.default.count({ channel: channel === null || channel === void 0 ? void 0 : channel._id, blocked: false }).lean().exec();
                    channel['totalPosts'] = totalPosts;
                    return channel;
                }));
                return res.status(200).send(channels);
            }
            catch (err) {
                return res.status(400).send({ success: false, "msg": errorFormatter_1.default(err) });
            }
        };
        this.getMediaByIdForFeedsCms = async (req, res) => {
            var _a, _b;
            try {
                let _id = (_a = req === null || req === void 0 ? void 0 : req.params) === null || _a === void 0 ? void 0 : _a._id;
                assert_1.default.ok(_id, _id + " does not exist.");
                assert_1.default.ok(helper_1.validObjectIdRegex((_b = req === null || req === void 0 ? void 0 : req.params) === null || _b === void 0 ? void 0 : _b._id), "media " + _id + " does not exist.");
                let mediaExists = await Media_1.default.exists({ "_id": _id });
                assert_1.default.ok((mediaExists), "media " + _id + " does not exist.");
                let media = ObjectId(req.params._id);
                let medias = await Media_1.default.aggregate([
                    {
                        "$match": { "_id": media }
                    },
                    {
                        "$lookup": {
                            "from": "interests",
                            "localField": "interests",
                            "foreignField": "_id",
                            "as": "interests"
                        }
                    },
                    {
                        "$lookup": {
                            "from": "channels",
                            "localField": "channel",
                            "foreignField": "_id",
                            "as": "channel"
                        }
                    },
                    {
                        "$unwind": "$channel"
                    },
                    {
                        "$project": Object.assign({}, Media_1.fieldSet)
                    },
                    {
                        "$limit": 1
                    }
                ]);
                media = lodash_1.default.first(medias);
                media = helper_1.descriptionConverter(media);
                return res.status(200).send({ success: true, msg: null, data: media });
            }
            catch (err) {
                return res.status(400).send({ success: false, msg: errorFormatter_1.default(err) });
            }
        };
        this.getMediaByIdForFeeds = async (req, res) => {
            var _a, _b, _c, _d, _e, _f;
            try {
                let { _id } = req.params;
                let filters = [];
                assert_1.default.ok(_id, _id + " does not exist.");
                assert_1.default.ok(helper_1.validObjectIdRegex(_id), "media " + _id + " does not exist.");
                let mediaExists = await Media_1.default.exists({ "_id": _id });
                assert_1.default.ok((mediaExists), "media " + _id + " does not exist.");
                _id && filters.push({
                    "match": {
                        "document._id": _id
                    }
                });
                let medias = await this.elasticSearch({
                    type: AppConstants_1.KOPPR_SEARCH_INDEX_PREFIX.MEDIA, otherFilters: {
                        "must": filters
                    }, limit: 1
                });
                let media;
                if (medias === null || medias === void 0 ? void 0 : medias.length) {
                    media = lodash_1.default.first(medias);
                }
                else {
                    media = await Media_1.default.findOne({ _id })
                        .populate('channel').lean().exec();
                    media = Object.assign(Object.assign({}, media), { channelThumbnailUrl: (_a = media === null || media === void 0 ? void 0 : media.channel) === null || _a === void 0 ? void 0 : _a.thumbnailUrl, channelName: (_b = media === null || media === void 0 ? void 0 : media.channel) === null || _b === void 0 ? void 0 : _b.name, channelCountry: (_c = media === null || media === void 0 ? void 0 : media.channel) === null || _c === void 0 ? void 0 : _c.country, channelPermalinkName: (_d = media === null || media === void 0 ? void 0 : media.channel) === null || _d === void 0 ? void 0 : _d.permalinkName, channelBlocked: (_e = media === null || media === void 0 ? void 0 : media.channel) === null || _e === void 0 ? void 0 : _e.blocked });
                    media.channel = (_f = media === null || media === void 0 ? void 0 : media.channel) === null || _f === void 0 ? void 0 : _f._id;
                }
                helper_1.descriptionConverter(media);
                return res.status(200).send({ success: true, msg: null, data: media });
            }
            catch (err) {
                return res.status(400).send({ success: false, msg: errorFormatter_1.default(err) });
            }
        };
        this.getMediaByInterest = async (req, res) => {
            var _a;
            try {
                let { otherOptions, start, end } = req.query;
                otherOptions = JSON.parse(otherOptions);
                let isValidAttributes = Object.values(AppConstants_1.GET_ALL_MEDIA_REQUIRED_ARGS).every((k) => { return k in (req === null || req === void 0 ? void 0 : req.query); });
                assert_1.default.ok(isValidAttributes, `Invalid query string parameters.Please specify exactly these parameters: ${Object.values(AppConstants_1.GET_ALL_MEDIA_REQUIRED_ARGS).join(' or ')}`);
                let { interest, country, type } = req.query;
                if (type) {
                    let validMediaType = (_a = Object.values(AppConstants_1.VALID_MEDIA_TYPES_FOR_INTEREST)) === null || _a === void 0 ? void 0 : _a.some(v => v === type);
                    assert_1.default.ok(validMediaType, `Query string parameter <mediaType> must be one of ${Object.values(AppConstants_1.VALID_MEDIA_TYPES_FOR_INTEREST).join(' or ')}`);
                }
                assert_1.default.ok(((country === null || country === void 0 ? void 0 : country.length) === 2), `Parameter <country> must be a valid two-digit ISO country code.`);
                assert_1.default.ok(interest, `Interest id ${interest} does not exist.`);
                let query = {};
                let filters = [];
                let isValidId = helper_1.validObjectIdRegex(interest);
                isValidId && (filters.push({
                    "match": {
                        "document._id": interest
                    }
                }));
                !isValidId && (filters.push({
                    "term": {
                        "document.permalinkName.keyword": interest
                    }
                }));
                let interests = await this.elasticSearch({
                    type: AppConstants_1.KOPPR_SEARCH_INDEX_PREFIX.INTEREST, otherFilters: {
                        "must": filters
                    }, limit: 1
                });
                let interestInfo = lodash_1.default.first(interests);
                assert_1.default.ok(interestInfo, `Interest id ${interest} does not exist.`);
                start = Number(start);
                end = Number(end);
                assert_1.default.ok((!isNaN(start) || !isNaN(end)), "Query string parameters <start, limit> must be positive integers.");
                assert_1.default.ok(start >= 0, "Query string parameter <skip> must be a positive integer.");
                assert_1.default.ok(end > 0, "Query string parameter <limit> must be a non-zero positive integer.");
                filters = [];
                let mustFilters = [
                    {
                        "match": {
                            "document.channelBlocked": false
                        },
                    }
                ];
                !isValidId && mustFilters.push({
                    "term": {
                        "document.interests.permalinkName.keyword": interest
                    }
                });
                isValidId && mustFilters.push({
                    "match": {
                        "document.interests._id": interest
                    }
                });
                let mustNotFilters = [
                    {
                        "match": {
                            "document.channelBlocked": true
                        }
                    },
                    {
                        "match": {
                            "document.blocked": true
                        }
                    }
                ];
                let totalMedias = await this.elasticSearch({
                    type: AppConstants_1.KOPPR_SEARCH_INDEX_PREFIX.MEDIA, query, country, mediaType: type,
                    otherFilters: {
                        "must": mustFilters,
                        "must_not": mustNotFilters
                    }
                });
                totalMedias = (totalMedias === null || totalMedias === void 0 ? void 0 : totalMedias.length) || 0;
                let esQuery = {
                    type: AppConstants_1.KOPPR_SEARCH_INDEX_PREFIX.MEDIA, query, country, mediaType: type, skip: start, limit: end,
                    otherFilters: {
                        "must": mustFilters,
                        "must_not": mustNotFilters
                    }
                };
                type !== 'all' && (esQuery['sort'] = [{
                        "document.pubDate": { "order": "desc" }
                    }]);
                let medias = await this.elasticSearch(esQuery);
                medias = helper_1.descriptionConverter(medias);
                return res.status(200).send({ success: true, msg: null, data: medias, totalCount: totalMedias, interestInfo: interestInfo });
            }
            catch (err) {
                log("Error in getMediaByInterest(): ", err);
                return res.status(400).send({ success: false, msg: errorFormatter_1.default(err) });
            }
        };
        this.getMedia = async (req, res) => {
            try {
                let { start, end } = req.body;
                let isValidAttributes = Object.values(AppConstants_1.GET_MEDIA_REQUIRED_ARGS).every((k) => { return k in (req === null || req === void 0 ? void 0 : req.body); });
                assert_1.default.ok(isValidAttributes, `Invalid query string parameters.Please specify exactly these parameters: ${Object.values(AppConstants_1.GET_MEDIA_REQUIRED_ARGS).join(' or ')}`);
                start = Number(start);
                end = Number(end);
                assert_1.default.ok((!isNaN(start) || !isNaN(end)), "Query string parameters <start, limit> must be positive integers.");
                assert_1.default.ok(start >= 0, "Query string parameter <skip> must be a positive integer.");
                assert_1.default.ok(end > 0, "Query string parameter <limit> must be a non-zero positive integer.");
                let medias = await Media_1.default.find({}).skip(start).limit(end).sort({ "_id": -1 }).lean().exec();
                medias = helper_1.descriptionConverter(medias);
                return res.status(200).send({ success: true, msg: null, data: (medias || []) });
            }
            catch (err) {
                return res.status(400).send({ success: false, msg: errorFormatter_1.default(err) });
            }
        };
        this.getRecommendationsNew = async (req, res) => {
            var _a;
            try {
                let medias;
                let { otherOptions, userId, mediaType, country, start, end } = req.query;
                otherOptions = JSON.parse(otherOptions);
                let userTags = [];
                let isValidAttributes = Object.values(AppConstants_1.GET_RECOMMENDATION_MEDIA_REQUIRED_ARGS).every((k) => { return k in (req === null || req === void 0 ? void 0 : req.query); });
                assert_1.default.ok(isValidAttributes, `Invalid query string parameters.Please specify exactly these parameters: ${Object.values(AppConstants_1.GET_RECOMMENDATION_MEDIA_REQUIRED_ARGS).join(' or ')}`);
                let validMediaType = (_a = Object.values(AppConstants_1.VALID_MEDIA_TYPES)) === null || _a === void 0 ? void 0 : _a.some(v => v === mediaType);
                assert_1.default.ok(validMediaType, `Query string parameter <mediaType> must be one of ${Object.values(AppConstants_1.VALID_MEDIA_TYPES).join(' or ')}`);
                let validCountry = (index_1.validISOCode(country));
                assert_1.default.ok(validCountry, `Parameter <country> must be a valid two-digit ISO country code.`);
                country !== 'all' && (country = country === null || country === void 0 ? void 0 : country.toUpperCase());
                start = Number(start);
                end = Number(end);
                assert_1.default.ok((!isNaN(start) || !isNaN(end)), "Query string parameters <start, end> must be integers.");
                assert_1.default.ok(start < end, "Query string parameter <start> must be less than <end>.");
                assert_1.default.ok(start >= 0, "start variable should be a positive integer");
                assert_1.default.ok(end > 0, "end variable should be a positive integer");
                let isValidUserId = (!userId.includes('-') && helper_1.validObjectIdRegex(userId));
                userId = isValidUserId ? userId : AppConstants_1.GUEST_USER;
                let userPreferences;
                if (userId !== AppConstants_1.GUEST_USER) {
                    userPreferences = await UserPreference_1.default.findOne({ "_id": userId }, { following: true, interests: true }).lean().exec();
                }
                userTags = (userPreferences === null || userPreferences === void 0 ? void 0 : userPreferences.interests) || [];
                let userFollowedChs = (userPreferences === null || userPreferences === void 0 ? void 0 : userPreferences.following) || [];
                try {
                    req.userId = userId;
                    medias = await this.createRecsDataFrameNew(mediaType, country, userTags, userFollowedChs, otherOptions);
                }
                catch (err) {
                    err = `Error in getRecommendationsNew(): ${err}`;
                    assert_1.default.fail(err);
                }
                medias = medias === null || medias === void 0 ? void 0 : medias.slice(start, end);
                medias = helper_1.descriptionConverter(medias);
                return res.status(200).send(medias);
            }
            catch (err) {
                log("Error in getRecommendationsNew(): ", err);
                return res.status(400).send({ success: false, msg: errorFormatter_1.default(err) });
            }
        };
        this.getRecentMedia = async (req, res) => {
            var _a;
            try {
                let query = {};
                let { mediaType, country, skip, limit, otherOptions } = req === null || req === void 0 ? void 0 : req.query;
                otherOptions = JSON.parse(otherOptions);
                let isValidAttributes = Object.values(AppConstants_1.GET_RECENT_MEDIAS).every((k) => { return k in (req === null || req === void 0 ? void 0 : req.query); });
                assert_1.default.ok(isValidAttributes, `Invalid query string parameters.Please specify exactly these parameters: ${Object.values(AppConstants_1.GET_RECENT_MEDIAS).join(' or ')}`);
                skip = Number(skip);
                limit = Number(limit);
                assert_1.default.ok((!isNaN(skip) || !isNaN(limit)), "Query string parameters <skip, limit> must be positive integers.");
                assert_1.default.ok(skip >= 0, "Query string parameter <skip> must be a positive integer.");
                assert_1.default.ok(limit > 0, "Query string parameter <limit> must be a non-zero positive integer.");
                assert_1.default.ok(((country === null || country === void 0 ? void 0 : country.length) === 2), `Parameter <country> must be a valid two-digit ISO country code.`);
                let validMediaType = (_a = Object.values(AppConstants_1.VALID_MEDIA_TYPES)) === null || _a === void 0 ? void 0 : _a.some(v => v === mediaType);
                assert_1.default.ok(validMediaType, `Query string parameter <mediaType> must be one of ${Object.values(AppConstants_1.VALID_MEDIA_TYPES).join(' or ')}`);
                country !== 'all' && (country = country === null || country === void 0 ? void 0 : country.toUpperCase());
                let mustNotFilters = [
                    {
                        "match": {
                            "document.channelBlocked": true
                        }
                    },
                    {
                        "match": {
                            "document.blocked": true
                        }
                    }
                ];
                let medias = [];
                medias = await this.elasticSearch({
                    type: AppConstants_1.KOPPR_SEARCH_INDEX_PREFIX.MEDIA, query, country, mediaType, skip, limit,
                    sort: [{
                            "document.pubDate": { "order": "desc" }
                        }],
                    otherFilters: {
                        "must": [{
                                "match": {
                                    "document.channelBlocked": false
                                }
                            }],
                        "must_not": mustNotFilters
                    }
                });
                medias = helper_1.descriptionConverter(medias);
                return res.status(200).send(medias);
            }
            catch (error) {
                log("Error in getRecentMedia(): ", error);
                return res.status(400).send({ success: false, msg: errorFormatter_1.default(error) });
            }
        };
        this.getRecentMediaNew = async (req, res) => {
            try {
                let query = {};
                let { mediaType, country, skip, limit } = req === null || req === void 0 ? void 0 : req.body;
                let isValidAttributes = Object.values(AppConstants_1.GET_RECENT_MEDIAS).every((k) => { return k in (req === null || req === void 0 ? void 0 : req.body); });
                assert_1.default.ok(isValidAttributes, `Invalid query string parameters.Please specify exactly these parameters: ${Object.values(AppConstants_1.GET_RECENT_MEDIAS).join(' or ')}`);
                skip = Number(skip);
                limit = Number(limit);
                assert_1.default.ok((!isNaN(skip) || !isNaN(limit)), "Query string parameters <skip, limit> must be positive integers.");
                assert_1.default.ok(skip >= 0, "Query string parameter <skip> must be a positive integer.");
                assert_1.default.ok(limit > 0, "Query string parameter <limit> must be a non-zero positive integer.");
                assert_1.default.ok(((country === null || country === void 0 ? void 0 : country.length) === 2), `Parameter <country> must be a valid two-digit ISO country code.`);
                mediaType.map((mt) => {
                    var _a;
                    let validMediaType = (_a = Object.values(AppConstants_1.VALID_MEDIA_TYPES)) === null || _a === void 0 ? void 0 : _a.some(v => v === mt);
                    assert_1.default.ok(validMediaType, `Query string parameter <mediaType> must be one of ${Object.values(AppConstants_1.VALID_MEDIA_TYPES).join(' or ')}`);
                });
                country !== 'all' && (country = country === null || country === void 0 ? void 0 : country.toUpperCase());
                let mustNotFilters = [
                    {
                        "match": {
                            "document.channelBlocked": true
                        }
                    },
                    {
                        "match": {
                            "document.blocked": true
                        }
                    }
                ];
                let medias = [];
                for (const mt of mediaType) {
                    let moreLimit = [AppConstants_1.FEED_MEDIA_TYPES.PODCAST, AppConstants_1.FEED_MEDIA_TYPES.SNIP].some((t) => t === mt);
                    limit = moreLimit ? 20 : limit;
                    let recs = await this.elasticSearch({
                        type: AppConstants_1.KOPPR_SEARCH_INDEX_PREFIX.MEDIA, query, mediaType: mt, country, skip, limit,
                        sort: [{
                                "document.pubDate": { "order": "desc" }
                            }],
                        otherFilters: {
                            "must": [{
                                    "match": {
                                        "document.channelBlocked": false
                                    }
                                }],
                            "must_not": mustNotFilters
                        }
                    });
                    medias = [...medias, ...recs];
                }
                medias = helper_1.descriptionConverter(medias);
                return res.status(200).send(medias);
            }
            catch (error) {
                log("Error in  getRecentMediaNew(): ", error);
                return res.status(400).send({ success: false, msg: errorFormatter_1.default(error) });
            }
        };
        this.getRecentMediaByChannel = async (req, res) => {
            var _a;
            try {
                let filters = [];
                let { mediaType, country, skip, limit, channel, channelPermalinkName, query: searchTerm, otherOptions } = req === null || req === void 0 ? void 0 : req.query;
                otherOptions = JSON.parse(otherOptions);
                let isValidAttributes = Object.values(AppConstants_1.GET_RECENT_MEDIAS_BY_CHANNEL).every((k) => { return k in (req === null || req === void 0 ? void 0 : req.query); });
                assert_1.default.ok(isValidAttributes, `Invalid query string parameters.Please specify exactly these parameters: ${Object.values(AppConstants_1.GET_RECENT_MEDIAS_BY_CHANNEL).join(' or ')}`);
                assert_1.default.ok((channel || channelPermalinkName), `Please specify exactly these parameters: channel or channelPermalinkName`);
                skip = Number(skip);
                limit = Number(limit);
                assert_1.default.ok((!isNaN(skip) || !isNaN(limit)), "Query string parameters <skip, limit> must be positive integers.");
                assert_1.default.ok(skip >= 0, "Query string parameter <skip> must be a positive integer.");
                assert_1.default.ok(limit > 0, "Query string parameter <limit> must be a non-zero positive integer.");
                assert_1.default.ok(((country === null || country === void 0 ? void 0 : country.length) === 2), `Parameter <country> must be a valid two-digit ISO country code.`);
                let validMediaType = (_a = Object.values(AppConstants_1.VALID_MEDIA_TYPES)) === null || _a === void 0 ? void 0 : _a.some(v => v === mediaType);
                assert_1.default.ok(validMediaType, `Query string parameter <mediaType> must be one of ${Object.values(AppConstants_1.VALID_MEDIA_TYPES).join(' or ')}`);
                country !== 'all' && (country = country === null || country === void 0 ? void 0 : country.toUpperCase());
                helper_1.validObjectIdRegex(channel) ? filters.push({
                    "match": {
                        "document.channel": channel
                    }
                }) : filters.push({
                    "term": {
                        "document.channelPermalinkName.keyword": channel
                    }
                });
                channelPermalinkName && filters.push({
                    "term": {
                        "document.channelPermalinkName.keyword": channelPermalinkName
                    }
                });
                let mustNotFilters = [
                    {
                        "match": {
                            "document.channelBlocked": true
                        }
                    },
                    {
                        "match": {
                            "document.blocked": true
                        }
                    }
                ];
                let medias = await this.elasticSearch({
                    type: AppConstants_1.KOPPR_SEARCH_INDEX_PREFIX.MEDIA, query: searchTerm, country, mediaType, skip, limit,
                    otherFilters: {
                        "must": [{
                                "match": {
                                    "document.channelBlocked": false
                                },
                            },
                            ...filters
                        ],
                        "must_not": mustNotFilters
                    },
                    sort: [{
                            "document.pubDate": { "order": "desc" }
                        }],
                });
                medias = helper_1.descriptionConverter(medias);
                return res.status(200).send(medias);
            }
            catch (error) {
                log("Error in getRecentMediaByChannel(): ", error);
                return res.status(400).send({ success: false, msg: errorFormatter_1.default(error) });
            }
        };
        this.getRecentMediaByInterest = async (req, res) => {
            var _a;
            try {
                let filters = [];
                let query = {};
                let { mediaType, country, skip, limit, interests, interestPermalinkName, query: searchTerm, otherOptions } = req === null || req === void 0 ? void 0 : req.query;
                otherOptions = JSON.parse(otherOptions);
                let isValidAttributes = Object.values(AppConstants_1.GET_RECENT_MEDIAS_BY_INTEREST).every((k) => { return k in (req === null || req === void 0 ? void 0 : req.query); });
                assert_1.default.ok(isValidAttributes, `Invalid query string parameters.Please specify exactly these parameters: ${Object.values(AppConstants_1.GET_RECENT_MEDIAS_BY_INTEREST).join(' or ')}`);
                assert_1.default.ok(((interests === null || interests === void 0 ? void 0 : interests.length) > 0 || interestPermalinkName), `Please specify exactly these parameters: interests or interestPermalinkName`);
                skip = Number(skip);
                limit = Number(limit);
                assert_1.default.ok((!isNaN(skip) || !isNaN(limit)), "Query string parameters <skip, limit> must be positive integers.");
                assert_1.default.ok(skip >= 0, "Query string parameter <skip> must be a positive integer.");
                assert_1.default.ok(limit > 0, "Query string parameter <limit> must be a non-zero positive integer.");
                assert_1.default.ok(((country === null || country === void 0 ? void 0 : country.length) === 2), `Parameter <country> must be a valid two-digit ISO country code.`);
                let validMediaType = (_a = Object.values(AppConstants_1.VALID_MEDIA_TYPES)) === null || _a === void 0 ? void 0 : _a.some(v => v === mediaType);
                assert_1.default.ok(validMediaType, `Query string parameter <mediaType> must be one of ${Object.values(AppConstants_1.VALID_MEDIA_TYPES).join(' or ')}`);
                country !== 'all' && (country = country === null || country === void 0 ? void 0 : country.toUpperCase());
                query = {
                    "type": mediaType == "all" ? { "$exists": true } : { "$eq": mediaType },
                    "blocked": { "$ne": true },
                    "channel.blocked": { "$ne": true },
                    "channel.country": country.toLowerCase() == "all" ? { "$exists": true } : { "$eq": country }
                };
                helper_1.validObjectIdRegex(interests) ? filters.push({
                    "match": {
                        "document.interests._id": interests
                    }
                }) : filters.push({
                    "term": {
                        "document.interests.permalinkName.keyword": interests
                    }
                });
                interestPermalinkName && filters.push({
                    "term": {
                        "document.interests.permalinkName.keyword": interestPermalinkName
                    }
                });
                let mustNotFilters = [
                    {
                        "match": {
                            "document.channelBlocked": true
                        }
                    },
                    {
                        "match": {
                            "document.blocked": true
                        }
                    }
                ];
                let medias = await this.elasticSearch({
                    type: AppConstants_1.KOPPR_SEARCH_INDEX_PREFIX.MEDIA, query: searchTerm, country, mediaType, skip, limit,
                    otherFilters: {
                        "must": [{
                                "match": {
                                    "document.channelBlocked": false
                                },
                            },
                            ...filters
                        ],
                        "must_not": mustNotFilters
                    },
                    sort: [{
                            "document.pubDate": { "order": "desc" }
                        }],
                });
                medias = helper_1.descriptionConverter(medias);
                return res.status(200).send(medias);
            }
            catch (error) {
                log("Error in getRecentMediaByInterest(): ", error);
                return res.status(400).send({ success: false, msg: errorFormatter_1.default(error) });
            }
        };
        this.getTrendingMedia = async (req, res) => {
            var _a;
            try {
                let query = {};
                let { mediaType, country, skip, limit, query: searchTerm, otherOptions } = req === null || req === void 0 ? void 0 : req.query;
                otherOptions = JSON.parse(otherOptions);
                let isValidAttributes = Object.values(AppConstants_1.GET_TRENDING_MEDIAS).every((k) => { return k in (req === null || req === void 0 ? void 0 : req.query); });
                assert_1.default.ok(isValidAttributes, `Invalid query string parameters.Please specify exactly these parameters: ${Object.values(AppConstants_1.GET_TRENDING_MEDIAS).join(' or ')}`);
                skip = Number(skip);
                limit = Number(limit);
                assert_1.default.ok((!isNaN(skip) || !isNaN(limit)), "Query string parameters <skip, limit> must be positive integers.");
                assert_1.default.ok(skip >= 0, "Query string parameter <skip> must be a positive integer.");
                assert_1.default.ok(limit > 0, "Query string parameter <limit> must be a non-zero positive integer.");
                assert_1.default.ok(((country === null || country === void 0 ? void 0 : country.length) === 2), `Parameter <country> must be a valid two-digit ISO country code.`);
                let validMediaType = (_a = Object.values(AppConstants_1.VALID_MEDIA_TYPES)) === null || _a === void 0 ? void 0 : _a.some(v => v === mediaType);
                assert_1.default.ok(validMediaType, `Query string parameter <mediaType> must be one of ${Object.values(AppConstants_1.VALID_MEDIA_TYPES).join(' or ')}`);
                country !== 'all' && (country = country === null || country === void 0 ? void 0 : country.toUpperCase());
                query = {
                    "type": mediaType == "all" ? { "$exists": true } : { "$eq": mediaType },
                    "blocked": { "$ne": true },
                    "channel.blocked": { "$ne": true },
                    "channelCountry": country.toLowerCase() == "all" ? { "$exists": true } : { "$eq": country }
                };
                let medias = await Media_1.default.aggregate(this.getTrendingMediaAggregateQuery({ skip, limit, query, searchTerm })).allowDiskUse(true).exec();
                medias = helper_1.descriptionConverter(medias);
                return res.status(200).send(medias);
            }
            catch (error) {
                log("Error in getTrendingMedia(): ", error);
                return res.status(400).send({ success: false, msg: errorFormatter_1.default(error) });
            }
        };
        this.getTrendingMediaByChannel = async (req, res) => {
            var _a;
            try {
                let query = {};
                let { mediaType, country, skip, limit, channel, channelPermalinkName, query: searchTerm, otherOptions } = req === null || req === void 0 ? void 0 : req.query;
                otherOptions = JSON.parse(otherOptions);
                let isValidAttributes = Object.values(AppConstants_1.GET_TRENDING_MEDIAS_BY_CHANNEL).every((k) => { return k in (req === null || req === void 0 ? void 0 : req.query); });
                assert_1.default.ok(isValidAttributes, `Invalid query string parameters.Please specify exactly these parameters: ${Object.values(AppConstants_1.GET_TRENDING_MEDIAS_BY_CHANNEL).join(' or ')}`);
                assert_1.default.ok((channel || channelPermalinkName), `Please specify exactly these parameters: channel or channelPermalinkName`);
                skip = Number(skip);
                limit = Number(limit);
                assert_1.default.ok((!isNaN(skip) || !isNaN(limit)), "Query string parameters <skip, limit> must be positive integers.");
                assert_1.default.ok(skip >= 0, "Query string parameter <skip> must be a positive integer.");
                assert_1.default.ok(limit > 0, "Query string parameter <limit> must be a non-zero positive integer.");
                assert_1.default.ok(((country === null || country === void 0 ? void 0 : country.length) === 2), `Parameter <country> must be a valid two-digit ISO country code.`);
                let validMediaType = (_a = Object.values(AppConstants_1.VALID_MEDIA_TYPES)) === null || _a === void 0 ? void 0 : _a.some(v => v === mediaType);
                assert_1.default.ok(validMediaType, `Query string parameter <mediaType> must be one of ${Object.values(AppConstants_1.VALID_MEDIA_TYPES).join(' or ')}`);
                country !== 'all' && (country = country === null || country === void 0 ? void 0 : country.toUpperCase());
                query = {
                    "type": mediaType == "all" ? { "$exists": true } : { "$eq": mediaType },
                    "blocked": { "$ne": true },
                    "channel.blocked": { "$ne": true },
                    "channelCountry": country.toLowerCase() == "all" ? { "$exists": true } : { "$eq": country }
                };
                helper_1.validObjectIdRegex(channel) ? (query["channel"] = new ObjectId(channel)) : (query["channelPermalinkName"] = channel);
                channelPermalinkName && (query["channelPermalinkName"] = channelPermalinkName);
                let medias = await Media_1.default.aggregate(this.getTrendingMediaAggregateQuery({ skip, limit, query, searchTerm })).allowDiskUse(true).exec();
                medias = helper_1.descriptionConverter(medias);
                return res.status(200).send(medias);
            }
            catch (error) {
                log("Error in getTrendingMediaByChannel(): ", error);
                return res.status(400).send({ success: false, msg: errorFormatter_1.default(error) });
            }
        };
        this.getTrendingMediaByInterest = async (req, res) => {
            var _a;
            try {
                let query = {};
                let { mediaType, country, skip, limit, interests, interestPermalinkName, query: searchTerm, otherOptions } = req === null || req === void 0 ? void 0 : req.query;
                otherOptions = JSON.parse(otherOptions);
                let isValidAttributes = Object.values(AppConstants_1.GET_TRENDING_MEDIAS_BY_INTEREST).every((k) => { return k in (req === null || req === void 0 ? void 0 : req.query); });
                assert_1.default.ok(isValidAttributes, `Invalid query string parameters.Please specify exactly these parameters: ${Object.values(AppConstants_1.GET_TRENDING_MEDIAS_BY_INTEREST).join(' or ')}`);
                assert_1.default.ok(((interests === null || interests === void 0 ? void 0 : interests.length) > 0 || interestPermalinkName), `Please specify exactly these parameters: interests or interestPermalinkName`);
                skip = Number(skip);
                limit = Number(limit);
                assert_1.default.ok((!isNaN(skip) || !isNaN(limit)), "Query string parameters <skip, limit> must be positive integers.");
                assert_1.default.ok(skip >= 0, "Query string parameter <skip> must be a positive integer.");
                assert_1.default.ok(limit > 0, "Query string parameter <limit> must be a non-zero positive integer.");
                assert_1.default.ok(((country === null || country === void 0 ? void 0 : country.length) === 2), `Parameter <country> must be a valid two-digit ISO country code.`);
                let validMediaType = (_a = Object.values(AppConstants_1.VALID_MEDIA_TYPES)) === null || _a === void 0 ? void 0 : _a.some(v => v === mediaType);
                assert_1.default.ok(validMediaType, `Query string parameter <mediaType> must be one of ${Object.values(AppConstants_1.VALID_MEDIA_TYPES).join(' or ')}`);
                country !== 'all' && (country = country === null || country === void 0 ? void 0 : country.toUpperCase());
                query = {
                    "type": mediaType == "all" ? { "$exists": true } : { "$eq": mediaType },
                    "blocked": { "$ne": true },
                    "channel.blocked": { "$ne": true },
                    "channelCountry": country.toLowerCase() == "all" ? { "$exists": true } : { "$eq": country }
                };
                helper_1.validObjectIdRegex(interests) ? (query["interests._id"] = new ObjectId(interests)) : (query["interests.permalinkName"] = interests);
                interestPermalinkName && (query["interests.permalinkName"] = interestPermalinkName);
                let medias = await Media_1.default.aggregate(this.getTrendingMediaAggregateQuery({ skip, limit, query, searchTerm })).allowDiskUse(true).exec();
                medias = helper_1.descriptionConverter(medias);
                return res.status(200).send(medias);
            }
            catch (error) {
                log("Error in getTrendingMediaByInterest(): ", error);
                return res.status(400).send({ success: false, msg: errorFormatter_1.default(error) });
            }
        };
        this.getTrendingMediaAggregateQuery = ({ skip = 0, limit = 20, query, searchTerm }) => {
            let aggregation = [];
            searchTerm && (aggregation = [{ "$match": { "$text": { "$search": searchTerm } } }]);
            return [
                ...aggregation,
                {
                    $addFields: {
                        totalReactions: {
                            "$sum": [
                                { "$size": { "$ifNull": ["$smile", []] } },
                                { "$size": { "$ifNull": ["$love", []] } },
                                { "$size": { "$ifNull": ["$sad", []] } },
                                { "$size": { "$ifNull": ["$hot", []] } },
                                { "$size": { "$ifNull": ["$angry", []] } },
                            ]
                        }
                    }
                },
                {
                    "$sort": {
                        "totalReactions": -1,
                        "pubDate": -1
                    }
                },
                {
                    "$lookup": {
                        "from": "interests",
                        "localField": "interests",
                        "foreignField": "_id",
                        "as": "interests"
                    }
                },
                {
                    "$lookup": {
                        "from": "channels",
                        "localField": "channel",
                        "foreignField": "_id",
                        "as": "channel"
                    }
                },
                {
                    "$project": Object.assign(Object.assign({}, Media_1.fieldSet), { totalReactions: 1 })
                },
                {
                    "$unwind": {
                        "path": "$channel",
                        "includeArrayIndex": "string",
                        "preserveNullAndEmptyArrays": false
                    }
                },
                {
                    "$unwind": {
                        "path": "$channelThumbnailUrl",
                        "includeArrayIndex": "string",
                        "preserveNullAndEmptyArrays": false
                    }
                },
                {
                    "$unwind": {
                        "path": "$channelName",
                        "includeArrayIndex": "string",
                        "preserveNullAndEmptyArrays": false
                    }
                },
                {
                    "$unwind": {
                        "path": "$channelCountry",
                        "includeArrayIndex": "string",
                        "preserveNullAndEmptyArrays": false
                    }
                },
                {
                    "$unwind": {
                        "path": "$channelPermalinkName",
                        "includeArrayIndex": "string",
                        "preserveNullAndEmptyArrays": false
                    }
                },
                {
                    "$match": query
                },
                {
                    "$skip": skip
                },
                {
                    "$limit": limit
                }
            ];
        };
        this.createRecsDataFrameNew = async (mediaType, country, userInterests, userFollowedChs, otherOptions) => {
            let recentMedias = [];
            mediaType = mediaType === 'youtube' ? 'video' : mediaType;
            if (mediaType === 'all') {
                let mediaTypes = ['video', 'blog', 'podcast', 'snip'];
                otherOptions.isAllMediaType = true;
                for (const iterMediaType of Object.values(mediaTypes)) {
                    let isLessPreference = [AppConstants_1.FEED_MEDIA_TYPES.PODCAST, AppConstants_1.FEED_MEDIA_TYPES.SNIP].some((t) => t === iterMediaType);
                    let limit = isLessPreference ? 50 : 100;
                    let recs = await this.newestMediaAggES(iterMediaType, country, limit, otherOptions);
                    recentMedias = [...recentMedias, ...recs];
                }
            }
            else {
                recentMedias = await this.newestMediaAggES(mediaType, country, 100, otherOptions);
            }
            let interestedMedias = [];
            interestedMedias = await this.getHashtagMatchedMediaES(mediaType, userInterests, country, 100, otherOptions);
            let followedChMedias = [];
            followedChMedias = await this.mediaFromFollowedChannelsAggES(mediaType, userFollowedChs, country, 100, otherOptions);
            let kopprSourceMedias = [];
            kopprSourceMedias = await this.mediaFromKopprSourcesAggES(mediaType, country, 100, otherOptions);
            let resultMedias = [];
            if ((followedChMedias === null || followedChMedias === void 0 ? void 0 : followedChMedias.length) <= 0 && (interestedMedias === null || interestedMedias === void 0 ? void 0 : interestedMedias.length) <= 0 && (recentMedias === null || recentMedias === void 0 ? void 0 : recentMedias.length) <= 0 && (kopprSourceMedias === null || kopprSourceMedias === void 0 ? void 0 : kopprSourceMedias.length) <= 0) {
                log(`[IMPORTANT] No or Empty medias! Something is not right`);
                return resultMedias;
            }
            log(`Generating Data frames...`);
            let dfMedia1 = [];
            let uniqueChannels = lodash_1.default.uniqBy(recentMedias, (v) => v.channelName).map((m) => m === null || m === void 0 ? void 0 : m.channelName);
            uniqueChannels.map(uc => {
                let medias = this.sortByDate(recentMedias.filter(rc => rc.channelName === uc)).slice(0, 10) || [];
                dfMedia1 = [...dfMedia1, ...medias];
            });
            dfMedia1 = lodash_1.default.shuffle(dfMedia1);
            log("DF MEDIA 1", dfMedia1);
            let dfMedia2 = lodash_1.default.shuffle(interestedMedias);
            let dfMedia3 = lodash_1.default.shuffle(followedChMedias);
            let dfMedia4 = lodash_1.default.shuffle(kopprSourceMedias);
            log(`Shuffling Data frames...`);
            resultMedias = [...dfMedia1, ...lodash_1.default.shuffle([...dfMedia2, ...dfMedia3, ...dfMedia4])];
            log(`Data frames Generated...`);
            return resultMedias;
        };
        this.sortByDate = (unsortedData) => {
            var _a;
            let sortedData = (_a = unsortedData.sort(function compare(a, b) {
                var dateA = new Date(a === null || a === void 0 ? void 0 : a.pubDate);
                var dateB = new Date(b === null || b === void 0 ? void 0 : b.pubDate);
                return dateA - dateB;
            })) === null || _a === void 0 ? void 0 : _a.reverse();
            return sortedData;
        };
        this.mediaFromFollowedChannelsAggES = async (mediaType, userFollowedChs, country, limit, otherOptions) => {
            let otherFilters = {
                "mustNot": [
                    {
                        "match": {
                            "document.blocked": true
                        }
                    },
                    {
                        "match": {
                            "document.channelBlocked": true
                        }
                    }
                ],
                "must": [
                    {
                        "match": {
                            "document.channelCountry": country
                        }
                    },
                    {
                        "range": {
                            "document.pubDate": {
                                "gte": date_fns_1.subMonths(new Date(), 2)
                            }
                        }
                    }
                ]
            };
            (userFollowedChs && (userFollowedChs === null || userFollowedChs === void 0 ? void 0 : userFollowedChs.length) > 0) && (otherFilters["filter"] = {
                "terms": {
                    "document.channel": userFollowedChs
                }
            });
            let records = await this.elasticSearch({
                type: AppConstants_1.KOPPR_SEARCH_INDEX_PREFIX.MEDIA, country, otherFilters, mediaType, limit, sort: [{
                        "document.pubDate": { "order": "desc" }
                    }]
            });
            return records;
        };
        this.getHashtagMatchedMediaES = async (mediaType, userInterests, country, limit, otherOptions) => {
            let otherFilters = {
                "mustNot": [
                    {
                        "match": {
                            "document.blocked": true
                        }
                    },
                    {
                        "match": {
                            "document.channelBlocked": true
                        }
                    }
                ],
                "must": [
                    {
                        "match": {
                            "document.channelCountry": country
                        }
                    },
                    {
                        "range": {
                            "document.pubDate": {
                                "gte": date_fns_1.subMonths(new Date(), 2)
                            }
                        }
                    }
                ]
            };
            (userInterests && (userInterests === null || userInterests === void 0 ? void 0 : userInterests.length) > 0) && (otherFilters["filter"] = {
                "terms": {
                    "document.interests._id": userInterests
                }
            });
            let records = await this.elasticSearch({
                type: AppConstants_1.KOPPR_SEARCH_INDEX_PREFIX.MEDIA, country, otherFilters, mediaType, limit, sort: [{
                        "document.pubDate": { "order": "desc" }
                    }]
            });
            return records;
        };
        this.getKopprChannelIds = async () => {
            let kopprSrcUrls = ["https://www.koppr.in/feed", "https://www.youtube.com/channel/UC942OdNzoJswXwAl_N5WBYw"];
            let sources = await Source_1.default.find({ url: { $in: kopprSrcUrls } }).lean().exec();
            let channels = sources.map(source => source === null || source === void 0 ? void 0 : source.channel);
            let kopprChannels = await Channel_1.default.find({ "_id": { "$in": channels } }) || [];
            let kopprChannelIds = kopprChannels === null || kopprChannels === void 0 ? void 0 : kopprChannels.map(kopprChannel => ObjectId(kopprChannel === null || kopprChannel === void 0 ? void 0 : kopprChannel._id));
            if ((kopprChannelIds === null || kopprChannelIds === void 0 ? void 0 : kopprChannelIds.length) <= 0) {
                log(`"No Koppr channels found in Channels, ingestion may be incomplete!`);
            }
            return kopprChannelIds;
        };
        this.overallSearch = async (req, res) => {
            try {
                let result = this.validateArgumentsOverall(req);
                const { query, country, mediaType, skip, limit } = result;
                let response = {};
                let searchTypes = Object.values(AppConstants_1.KOPPR_SEARCH_INDEX_PREFIX).filter(st => st !== AppConstants_1.KOPPR_SEARCH_INDEX_PREFIX.SOURCE);
                for (let searchType of searchTypes) {
                    let records = await this.elasticSearch({ type: searchType, query, country, mediaType, skip, limit });
                    response[`${searchType}s`] = records || [];
                }
                return res.status(200).send({ success: true, msg: null, results: response });
            }
            catch (err) {
                log("Error in overallSearch(): ", err);
                return res.status(400).send({ success: false, msg: errorFormatter_1.default(err) });
            }
        };
        this.getChannelsById = async (req, res) => {
            try {
                let query = {};
                let { _id } = req.query;
                let isValidId = helper_1.validObjectIdRegex(_id);
                isValidId && (query["document._id"] = _id);
                !isValidId && (query["document.permalinkName"] = _id);
                let channel = await Channel_1.default.exists(query);
                assert_1.default.ok(channel, `Channel id ${_id} does not exist.`);
                let filters = [];
                isValidId ? (filters.push({
                    "match": {
                        "document._id": _id
                    }
                })) : (filters.push({
                    "term": {
                        "document.permalinkName.keyword": _id
                    }
                }));
                let records = await this.elasticSearch({
                    type: AppConstants_1.KOPPR_SEARCH_INDEX_PREFIX.CHANNEL, otherFilters: {
                        "must": filters
                    }, limit: 1
                });
                channel = lodash_1.default.first(records);
                return res.status(200).send({ success: true, msg: null, data: channel });
            }
            catch (err) {
                return res.status(400).send({ success: false, msg: errorFormatter_1.default(err) });
            }
        };
        this.mediaSearch = async (req, res) => {
            try {
                let result = this.validateArgumentsOverall(req);
                const { query, country, mediaType, skip, limit } = result;
                let results = [];
                results = await this.elasticSearch({ type: AppConstants_1.KOPPR_SEARCH_INDEX_PREFIX.MEDIA, query, country, mediaType, skip, limit });
                return res.status(200).send({ success: true, msg: null, results });
            }
            catch (err) {
                log("Error in mediaSearch(): ", err);
                return res.status(400).send({ success: false, msg: errorFormatter_1.default(err) });
            }
        };
        this.interestSearch = async (req, res) => {
            try {
                let result = this.validateArgumentsInterests(req);
                const { query, skip, limit } = result;
                let results = [];
                results = await this.elasticSearch({ type: AppConstants_1.KOPPR_SEARCH_INDEX_PREFIX.INTEREST, query, skip, limit });
                results = results.map(result => {
                    var _a;
                    result.permalinkName = (_a = result === null || result === void 0 ? void 0 : result.permalinkName) !== null && _a !== void 0 ? _a : null;
                    return result;
                });
                return res.status(200).send({ success: true, msg: null, results });
            }
            catch (err) {
                return res.status(400).send({ success: false, msg: errorFormatter_1.default(err) });
            }
        };
        this.channelSearch = async (req, res) => {
            try {
                let result = this.validateArgumentsChannels(req);
                const { query, country, skip, limit } = result;
                let results = [];
                results = await this.elasticSearch({ type: AppConstants_1.KOPPR_SEARCH_INDEX_PREFIX.CHANNEL, query, country, skip, limit });
                return res.status(200).send({ success: true, msg: null, results });
            }
            catch (err) {
                log("Error in channelSearch(): ", err);
                return res.status(400).send({ success: false, msg: errorFormatter_1.default(err) });
            }
        };
        this.getSnips = async (req, res) => {
            var _a, _b, _c, _d;
            try {
                const role = (_b = (_a = req === null || req === void 0 ? void 0 : req.user) === null || _a === void 0 ? void 0 : _a.roles) === null || _b === void 0 ? void 0 : _b[0].type;
                let query = {};
                const skip = ((_c = req.body) === null || _c === void 0 ? void 0 : _c.skip) || 0;
                const limit = ((_d = req.body) === null || _d === void 0 ? void 0 : _d.limit) || 10;
                query.type = AppConstants_1.FEED_MEDIA_TYPES.SNIP;
                if (role !== AppConstants_1.ROLES.SUPER_ADMIN) {
                    query.isActive = true;
                }
                const snips = await Media_1.default.find(query)
                    .populate("channel")
                    .populate("createdBy")
                    .populate("updatedBy")
                    .skip(skip)
                    .limit(limit)
                    .sort({ createdAt: "desc" })
                    .lean()
                    .exec();
                return res.status(200).send({ success: true, msg: null, snips });
            }
            catch (err) {
                log("Error in getSnips(): ", err);
                return res
                    .status(400)
                    .send({ success: false, msg: errorFormatter_1.default(err) });
            }
        };
        this.fetchSnipsById = async (req, res) => {
            try {
                const query = req.params._id;
                const snips = await Media_1.default.findById(query)
                    .populate("channel")
                    .populate("createdBy")
                    .populate("updatedBy")
                    .lean()
                    .exec();
                return res.status(200).send({ success: true, msg: null, snips });
            }
            catch (err) {
                log("Error in fetchSnipsById(): ", err);
                return res
                    .status(400)
                    .send({ success: false, msg: errorFormatter_1.default(err) });
            }
        };
        this.createSnips = async (req, res) => {
            try {
                let payload = req.body;
                const date = new Date();
                const timeDifference = Math.abs(date.getTimezoneOffset());
                date.setMinutes(date.getMinutes() + timeDifference);
                const { pubDate, createdAt, updatedAt, longDescription } = req.body;
                !pubDate && (payload.pubDate = date);
                !createdAt && (payload.createdAt = date);
                !updatedAt && (payload.updatedAt = date);
                let snips = new Media_1.default(payload);
                snips.permalinkName = (snips === null || snips === void 0 ? void 0 : snips.permalinkName) ? lodash_1.default.kebabCase(snips === null || snips === void 0 ? void 0 : snips.permalinkName) + "-" + (snips === null || snips === void 0 ? void 0 : snips._id) : lodash_1.default.kebabCase(snips === null || snips === void 0 ? void 0 : snips.title) + "-" + (snips === null || snips === void 0 ? void 0 : snips._id);
                snips = await snips.save();
                return res.status(200).send({ success: true, _id: snips === null || snips === void 0 ? void 0 : snips._id });
            }
            catch (err) {
                log("Error in createSnips(): ", err);
                return res
                    .status(400)
                    .send({ success: false, msg: errorFormatter_1.default(err) });
            }
        };
        this.updateSnips = async (req, res) => {
            var _a, _b;
            try {
                let query = {};
                let snips = null;
                let payload = req.body;
                ((_a = req.body) === null || _a === void 0 ? void 0 : _a._id) && (query._id = (_b = req.body) === null || _b === void 0 ? void 0 : _b._id);
                let isObjectIdPresent = helper_1.validObjectIdRegex(lodash_1.default.last(payload['permalinkName'].split("-")));
                if (payload['permalinkName'] && !isObjectIdPresent) {
                    payload.permalinkName = lodash_1.default.kebabCase(payload === null || payload === void 0 ? void 0 : payload.permalinkName) + "-" + (payload === null || payload === void 0 ? void 0 : payload._id);
                }
                const date = new Date();
                const timeDifference = Math.abs(date.getTimezoneOffset());
                date.setMinutes(date.getMinutes() + timeDifference);
                const { updatedAt } = req.body;
                !updatedAt && (payload.updatedAt = date);
                snips = await Media_1.default.findOneAndUpdate(query, payload, { new: true }).exec();
                return res.status(200).send({ success: true, msg: "Snip Updated!" });
            }
            catch (err) {
                log("Error in updateSnips(): ", err);
                return res
                    .status(400)
                    .send({ success: false, msg: errorFormatter_1.default(err) });
            }
        };
        this.deleteSnips = async (req, res) => {
            var _a, _b;
            try {
                const query = { _id: (_a = req.body) === null || _a === void 0 ? void 0 : _a._id };
                let payload = {};
                const date = new Date();
                const timeDifference = Math.abs(date.getTimezoneOffset());
                date.setMinutes(date.getMinutes() + timeDifference);
                payload.isActive = false;
                const { updatedAt } = req.body;
                !updatedAt ? (payload.updatedAt = date) : (payload.updatedAt = (_b = req.body) === null || _b === void 0 ? void 0 : _b.updatedAt);
                await Media_1.default.findOneAndUpdate(query, payload).exec();
                return res.status(200).send({ success: true, msg: "Snips removed." });
            }
            catch (err) {
                log("Error in deleteSnips(): ", err);
                return res
                    .status(400)
                    .send({ success: false, msg: errorFormatter_1.default(err) });
            }
        };
        this.elasticSearch = async (data) => {
            var _a, _b, _c, _d;
            let { type, query, mediaType, channel, country, skip, limit, _id, otherFilters, otherOptions, otherQueries, sort = [], aggs = {} } = data;
            let filters = [];
            if (country && country !== 'all') {
                let countryKey = [AppConstants_1.KOPPR_SEARCH_INDEX_PREFIX.SOURCE, AppConstants_1.KOPPR_SEARCH_INDEX_PREFIX.CHANNEL].some(s => s === type) ? "document.country" : "document.channelCountry";
                filters.push({
                    "match": {
                        [countryKey]: country
                    }
                });
            }
            (mediaType && mediaType !== 'all') && filters.push({
                "match": {
                    "document.type": mediaType
                }
            });
            (_id) && filters.push({
                "match": {
                    "document._id": _id
                }
            });
            (channel) && filters.push({
                "match": {
                    "document.channel": channel
                }
            });
            (query && ((_a = Object.keys(query)) === null || _a === void 0 ? void 0 : _a.length)) && filters.push({
                "query_string": {
                    query
                }
            });
            let filter = {};
            if (filters.length > 0) {
                let otherMustFilters = lodash_1.default.isArray(otherFilters === null || otherFilters === void 0 ? void 0 : otherFilters.must) ? otherFilters === null || otherFilters === void 0 ? void 0 : otherFilters.must : [];
                filter["must"] = [...filters, ...(otherMustFilters)];
                otherFilters === null || otherFilters === void 0 ? true : delete otherFilters['must'];
            }
            log(JSON.stringify({
                index: type + '_index_new',
                body: Object.assign(Object.assign({}, otherOptions), { "query": otherQueries || {
                        "bool": Object.assign(Object.assign({}, filter), otherFilters)
                    }, "from": skip, "size": limit, "sort": sort, "aggs": aggs })
            }, null, 4));
            const esClient = new ESClient_1.ESClient({}).client;
            const result = await esClient.search({
                index: type + '_index_new',
                body: Object.assign(Object.assign({}, otherOptions), { "query": otherQueries || {
                        "bool": Object.assign(Object.assign({}, filter), otherFilters)
                    }, "from": skip, "size": limit, "sort": sort, "aggs": aggs })
            });
            let records = (_d = (_c = (_b = result === null || result === void 0 ? void 0 : result.body) === null || _b === void 0 ? void 0 : _b.hits) === null || _c === void 0 ? void 0 : _c.hits) === null || _d === void 0 ? void 0 : _d.map((feed) => {
                var _a;
                return (_a = feed === null || feed === void 0 ? void 0 : feed._source) === null || _a === void 0 ? void 0 : _a.document;
            });
            return records || [];
        };
        this.migrateSnipsPermalink = async (req, res) => {
            try {
                let snips = await Media_1.default.find({ type: AppConstants_1.FEED_MEDIA_TYPES.SNIP }).lean().exec();
                let results = [];
                for (const snip of snips) {
                    let permalinkName = lodash_1.default.kebabCase(snip.permalinkName) + "-" + (snip === null || snip === void 0 ? void 0 : snip._id);
                    results.push(await Media_1.default.findOneAndUpdate({ _id: snip === null || snip === void 0 ? void 0 : snip._id }, { $set: { permalinkName: permalinkName } }, { upsert: false, new: true }));
                }
                return res.send({ success: true, msg: "Snips Migration Complete!" });
            }
            catch (error) {
                return res.status(500).send({ success: false, msg: "Snips Migration Failed!" });
            }
        };
        this.generateInterestsPermalink = async (req, res) => {
            try {
                let interests = await Interest_1.default.find().lean().exec();
                await Promise.all(interests.map(async (interest) => {
                    if (interest === null || interest === void 0 ? void 0 : interest.permalinkName) {
                        return;
                    }
                    let permalinkName = lodash_1.default.kebabCase(interest === null || interest === void 0 ? void 0 : interest.name);
                    await Interest_1.default.updateOne({ _id: interest === null || interest === void 0 ? void 0 : interest._id }, { $set: { permalinkName } });
                }));
                return res.status(200).send({ success: true, msg: "Permalinks Added" });
            }
            catch (err) {
                log("Failed to Update permalinks for interests", err);
                return res.status(400).send({ success: false, msg: errorFormatter_1.default(err) });
            }
        };
        this.params = params;
        this.ingestedMediaStats = this.ingestedMediaStats.bind(this);
        this.getMediaCountStats = this.getMediaCountStats.bind(this);
    }
    async test(res) {
        res.status(200).send("Feed Rest Controller Routes working!");
    }
    async getMediaById(req, res) {
        var _a;
        try {
            const _id = (_a = req === null || req === void 0 ? void 0 : req.params) === null || _a === void 0 ? void 0 : _a._id;
            assert_1.default.ok(_id, AppConstants_1.ERROR_CODES.E5005);
            let media = await Media_1.default.findOne({ _id }).populate('channel').populate({ path: 'interests', model: 'interests' }).lean().exec();
            assert_1.default.ok(media, AppConstants_1.ERROR_CODES.E5021);
            let channel = media === null || media === void 0 ? void 0 : media.channel;
            media = {
                "channelCountry": channel === null || channel === void 0 ? void 0 : channel.country,
                "channel": channel === null || channel === void 0 ? void 0 : channel._id,
                "channelName": channel === null || channel === void 0 ? void 0 : channel.name,
                "channelThumbnailUrl": channel === null || channel === void 0 ? void 0 : channel.thumbnailUrl,
                "_id": media === null || media === void 0 ? void 0 : media._id,
                "angry": media === null || media === void 0 ? void 0 : media.angry,
                "description": media === null || media === void 0 ? void 0 : media.description,
                "hot": media === null || media === void 0 ? void 0 : media.hot,
                "interests": media === null || media === void 0 ? void 0 : media.interests,
                "love": media === null || media === void 0 ? void 0 : media.love,
                "pubDate": media === null || media === void 0 ? void 0 : media.pubDate,
                "sad": media === null || media === void 0 ? void 0 : media.sad,
                "smile": media === null || media === void 0 ? void 0 : media.smile,
                "permalinkName": media === null || media === void 0 ? void 0 : media.permalinkName,
                "thumbnailUrl": media === null || media === void 0 ? void 0 : media.thumbnailUrl,
                "title": media === null || media === void 0 ? void 0 : media.title,
                "type": media === null || media === void 0 ? void 0 : media.type,
                "longDescription": media === null || media === void 0 ? void 0 : media.longDescription,
                "url": media === null || media === void 0 ? void 0 : media.url
            };
            res.status(200).send({
                success: true,
                media
            });
        }
        catch (err) {
            res.status(400).send(ErrorHandler_1.errorFormatter(err));
        }
    }
    async getSources(req, res) {
        var _a, _b;
        let payload = null;
        let sources;
        let query = {};
        try {
            payload = req.query;
            let mediaType = payload.mediaType;
            let isReqdParamsAvailable = Object.values(AppConstants_1.GET_SOURCES_REQUIRED_PARAMS).every((k) => { return k in (req === null || req === void 0 ? void 0 : req.query); });
            assert_1.default.ok(isReqdParamsAvailable, "Invalid parameters in request body. Please specify exactly these parameters: " +
                AppConstants_1.GET_SOURCES_REQUIRED_PARAMS.MEDIA_TYPE);
            let isValidType = Object.values(AppConstants_1.VALID_MEDIA_TYPES).some(v => v === mediaType);
            assert_1.default.ok(isValidType, `Parameter mediaType must be one of ${Object.values(AppConstants_1.VALID_MEDIA_TYPES).join(' or ')}`);
            mediaType === 'video' && (mediaType = "youtube");
            query.type = mediaType === 'all' ? { "$exists": true } : { "$eq": mediaType };
            ((_a = req.query) === null || _a === void 0 ? void 0 : _a.channel) && (query.channel = (_b = req.query) === null || _b === void 0 ? void 0 : _b.channel);
            sources = await Source_1.default.find(query).lean().exec();
            return res.status(200).send({ success: true, msg: null, data: sources });
        }
        catch (err) {
            return res.status(400).send({ success: false, "msg": errorFormatter_1.default(err) });
        }
    }
    async editSource(req, res) {
        try {
            let sources;
            let reqBodyKeys = Object.keys(req === null || req === void 0 ? void 0 : req.body);
            let allowedEditSource = lodash_1.default.pick(req.body, Object.values(AppConstants_1.EDIT_SOURCE_PARAMETERS));
            (reqBodyKeys.length > Object.keys(allowedEditSource).length) && res.status(400).send({
                "msg": `Invalid parameters passes. Valid Parameters are : ${Object.values(AppConstants_1.EDIT_SOURCE_PARAMETERS).join(' or ')}`
            });
            assert_1.default.ok(helper_1.validObjectIdRegex(req.params._id), "Invalid Object ID " + req.params._id);
            let sourceExists = await Source_1.default.exists({ "_id": req.params._id });
            assert_1.default.ok(sourceExists, "Source could not be found with id :" + req.params._id);
            let payload = {};
            payload['_id'] = req.params._id;
            let query = {};
            query._id = payload['_id'];
            allowedEditSource.mediaType = allowedEditSource.mediaType === 'video' ? 'youtube' : allowedEditSource.mediaType;
            (allowedEditSource === null || allowedEditSource === void 0 ? void 0 : allowedEditSource.hasOwnProperty('ingestionActive')) && (payload['ingestionActive'] = allowedEditSource.ingestionActive);
            (allowedEditSource === null || allowedEditSource === void 0 ? void 0 : allowedEditSource.name) && (payload['name'] = allowedEditSource.name);
            (allowedEditSource === null || allowedEditSource === void 0 ? void 0 : allowedEditSource.channel) && (payload['channel'] = allowedEditSource.channel);
            (allowedEditSource === null || allowedEditSource === void 0 ? void 0 : allowedEditSource.mediaType) && (payload['type'] = allowedEditSource.mediaType);
            (allowedEditSource === null || allowedEditSource === void 0 ? void 0 : allowedEditSource.url) && (payload['url'] = allowedEditSource.url);
            let editField = payload;
            sources = await Source_1.default.findOneAndUpdate(query, editField, { upsert: false, new: true }).exec();
            return res.status(200).send({ success: true, msg: null, data: sources });
        }
        catch (err) {
            return res.status(400).send({ success: false, "msg": errorFormatter_1.default(err) });
        }
    }
    async addSource(req, res) {
        let sources;
        try {
            let payload = {};
            let { url, name, mediaType: type, ingestionActive, channel } = req.body;
            let isReqdParamsAvailable = Object.values(AppConstants_1.ADD_REQUIRED_SOURCE).every((k) => { return k in (req === null || req === void 0 ? void 0 : req.body); });
            assert_1.default.ok(isReqdParamsAvailable, `Invalid parameters. Please specify exactly these parameters: ${Object.values(AppConstants_1.ADD_REQUIRED_SOURCE).join(' or ')}`);
            assert_1.default.ok(url || type, "Invalid query string parameters. Please specify url, mediaType");
            assert_1.default.ok(helper_1.validURL(url), "Parameter url must be a valid URL.");
            (url.substr(url.length - 1) === '/') ? (payload['url'] = url.substring(0, url.length - 1)) : (payload['url'] = url);
            let urlExists = await Source_1.default.exists({ "url": url });
            assert_1.default.ok(!(urlExists), "Source with url " + payload['url'] + " already exists.");
            let isValidType = Object.values(AppConstants_1.VALID_MEDIA_TYPES).some(v => v === type);
            assert_1.default.ok(isValidType, `Query String Parameter mediaType must be one of ${Object.values(AppConstants_1.VALID_MEDIA_TYPES).join(' or ')}`);
            type === 'video' && (type = 'youtube');
            payload['type'] = type;
            (name) && (payload['name'] = name);
            channel && (payload['channel'] = channel);
            (ingestionActive || !ingestionActive) && (payload['ingestionActive'] = ingestionActive);
            sources = new Source_1.default(payload);
            sources = await sources.save();
            return res.status(200).send({ success: true, msg: null, data: sources });
        }
        catch (err) {
            return res.status(400).send({ success: false, "msg": errorFormatter_1.default(err) });
        }
    }
    async getChannelsCms(req, res) {
        try {
            let channels;
            let { start, end, country } = req.query;
            let query = {};
            start = Number(start);
            end = Number(end);
            let isReqdParamsAvailable = Object.values(AppConstants_1.GET_CHANNELS_REQUIRED_PARAMS).every((k) => { return k in (req === null || req === void 0 ? void 0 : req.query); });
            assert_1.default.ok(isReqdParamsAvailable, `Invalid query string parameters. Please specify exactly these parameters: ${Object.values(AppConstants_1.GET_CHANNELS_REQUIRED_PARAMS).join(' or ')}`);
            if (country) {
                query.country = country.toUpperCase();
                assert_1.default.ok(country.length === 2, "Parameter country must be a valid two-digit ISO country code, or 'all'.");
            }
            if (start || end) {
                assert_1.default.ok((!isNaN(start) || !isNaN(end)), "Query string parameters <start, limit> must be positive integers.");
                assert_1.default.ok(start >= 0, "Query string parameter <skip> must be a positive integer.");
                assert_1.default.ok(end > 0, "Query string parameter <limit> must be a non-zero positive integer.");
                channels = await Channel_1.default.find(query).sort({ "createdAt": -1 }).skip(start).limit(end).exec();
            }
            else {
                channels = await Channel_1.default.find(query).sort({ "createdAt": -1 }).exec();
            }
            return res.status(200).send({ success: true, msg: null, data: channels });
        }
        catch (err) {
            return res.status(400).send({ success: false, "msg": errorFormatter_1.default(err) });
        }
    }
    async getMediaCountStats(req, res) {
        try {
            let totalMedias = await Media_1.default.countDocuments();
            let totalChannels = await Channel_1.default.countDocuments();
            let totalInterests = await Interest_1.default.countDocuments();
            let totalSources = await Source_1.default.countDocuments();
            let stats = [
                { "name": "Channels", "value": totalChannels, "description": "Total Available Channels" },
                { "name": "Sources", "value": totalSources, "description": "Total Available Sources" },
                { "name": "Interests", "value": totalInterests, "description": "Total Available Interests" },
                { "name": "Medias", "value": totalMedias, "description": "Total Available Medias" }
            ];
            return res.status(200).send({
                success: true, msg: null, data: stats
            });
        }
        catch (err) {
            log("Error in getMediaCountStats(): ", err);
            return res.status(400).send({ success: false, "msg": errorFormatter_1.default(err) });
        }
    }
    async ingestedMediaStats(req, res) {
        try {
            let { fromDate, toDate } = req.query;
            let query = {};
            if (fromDate || toDate) {
                const fromDateObj = new Date(fromDate);
                const toDateObj = new Date(toDate);
                toDateObj.setHours(23, 59, 59, 999);
                query.pubDate = { $gte: fromDateObj, $lte: toDateObj };
            }
            let stats = await Media_1.default.aggregate(this.ingestedMediaAggregation(query)).allowDiskUse(true).exec();
            return res.status(200).send({
                success: true, msg: null, data: {
                    ingestionStats: stats
                }
            });
        }
        catch (err) {
            return res.status(400).send({ success: false, "msg": errorFormatter_1.default(err) });
        }
    }
    ingestedMediaAggregation(query = {}) {
        let allowedMediaTypes = Object.values(AppConstants_1.FEED_MEDIA_TYPES).filter((at) => {
            return at !== AppConstants_1.FEED_MEDIA_TYPES.ALL;
        });
        let addFields = {};
        allowedMediaTypes === null || allowedMediaTypes === void 0 ? void 0 : allowedMediaTypes.map((t) => {
            addFields[t] = {
                $size: {
                    $filter: {
                        input: "$allMediaTypes",
                        as: 'type',
                        cond: { $eq: ["$$type", t] }
                    }
                }
            };
        });
        return [
            {
                "$match": query
            },
            {
                "$group": {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$pubDate" } },
                    totalMediaIngested: { $sum: 1 },
                    allMediaTypes: {
                        "$push": "$type"
                    }
                }
            },
            {
                $addFields: addFields
            },
            {
                $project: {
                    allMediaTypes: 0
                }
            },
            {
                $sort: { _id: 1 }
            }
        ];
    }
    async addChannel(req, res) {
        var _a;
        try {
            let channel;
            assert_1.default.ok(helper_1.validPermalinkName(req.body.permalinkName), "permalinkName is not URL safe. You may only use alphanumerics, dashes, and underscores.");
            let channelExists = await Channel_1.default.exists({ permalinkName: req.body.permalinkName });
            assert_1.default.ok(!channelExists, "Channel with same permalink already exists");
            let reqBodyKeys = Object.keys(req === null || req === void 0 ? void 0 : req.body);
            var allowedParams = Object.values(AppConstants_1.EDIT_CHANNEL_PARAMETERS);
            let payload = lodash_1.default.pick(req.body, allowedParams);
            (reqBodyKeys.length > ((_a = Object.keys(payload)) === null || _a === void 0 ? void 0 : _a.length)) && res.status(400).send({
                "msg": `Invalid parameters passed. Valid Parameters are : ${Object.values(AppConstants_1.ADD_CHANNEL_PARAMETERS).join(' or ')}`
            });
            channel = new Channel_1.default(payload);
            channel = await channel.save();
            return res.status(200).send({ success: true, msg: null, data: channel });
        }
        catch (err) {
            return res.status(400).send({ success: false, "msg": errorFormatter_1.default(err) });
        }
    }
    async editChannel(req, res) {
        var _a, _b;
        try {
            let channels;
            let query = {};
            query._id = ObjectId(req.params._id);
            assert_1.default.ok(helper_1.validObjectIdRegex((_a = req === null || req === void 0 ? void 0 : req.params) === null || _a === void 0 ? void 0 : _a._id), "Channel Id " + ((_b = req === null || req === void 0 ? void 0 : req.params) === null || _b === void 0 ? void 0 : _b._id) + " does not exist.");
            let channelExists = await Channel_1.default.exists({ "_id": req.params._id });
            assert_1.default.ok(channelExists, "Channel could not be found with id :" + req.params._id);
            assert_1.default.ok(helper_1.validPermalinkName(req.body.permalinkName), "permalinkName is not URL safe. You may only use alphanumerics, dashes, and underscores.");
            let reqBodyKeys = Object.keys(req === null || req === void 0 ? void 0 : req.body);
            let allowedParams = Object.values(AppConstants_1.EDIT_CHANNEL_PARAMETERS);
            let allowedEditChannel = lodash_1.default.pick(req.body, allowedParams);
            (reqBodyKeys.length > Object.keys(allowedEditChannel).length) && res.status(400).send({
                "msg": `Invalid parameters passes. Valid Parameters are : ${Object.values(AppConstants_1.EDIT_CHANNEL_PARAMETERS).join(' or ')}`
            });
            let editField = allowedEditChannel;
            channels = await Channel_1.default.findOneAndUpdate(query, editField, { upsert: false, new: true }).exec();
            return res.status(200).send({ success: true, msg: null, data: channels });
        }
        catch (err) {
            return res.status(400).send({ success: false, "msg": errorFormatter_1.default(err) });
        }
    }
    async oldGetChannelInfo(req, res) {
        var _a, _b, _c, _d, _e;
        try {
            let channels;
            let blocked = (_a = req === null || req === void 0 ? void 0 : req.body) === null || _a === void 0 ? void 0 : _a.blocked;
            let query = {};
            blocked && (query.blocked = helper_1.convertStringToBoolean(blocked));
            assert_1.default.ok((_b = req === null || req === void 0 ? void 0 : req.params) === null || _b === void 0 ? void 0 : _b._id, "ID does not exist");
            assert_1.default.ok(helper_1.validObjectIdRegex((_c = req === null || req === void 0 ? void 0 : req.params) === null || _c === void 0 ? void 0 : _c._id), "Invalid Object ID :" + ((_d = req === null || req === void 0 ? void 0 : req.params) === null || _d === void 0 ? void 0 : _d._id));
            let channelExists = await Channel_1.default.exists({ "_id": req.params._id });
            assert_1.default.ok(channelExists, "Channel could not be found with id :" + req.params._id);
            query._id = ObjectId((_e = req === null || req === void 0 ? void 0 : req.params) === null || _e === void 0 ? void 0 : _e._id);
            channels = await Channel_1.default.aggregate([
                { $match: query },
                {
                    "$lookup": {
                        "from": "medias",
                        "let": { "local_ch_id": "$_id" },
                        "pipeline": [
                            {
                                "$match": {
                                    "$expr": { "$eq": ["$$local_ch_id", "$channel"] }
                                }
                            },
                            {
                                "$limit": 50
                            },
                            {
                                "$lookup": {
                                    "from": "interests",
                                    "localField": "interests",
                                    "foreignField": "_id",
                                    "as": "interests"
                                }
                            }
                        ],
                        "as": "medias"
                    }
                }
            ]);
            return res.status(200).send({ success: true, msg: null, data: lodash_1.default.first(channels) });
        }
        catch (err) {
            return res.status(400).send({ success: false, "msg": errorFormatter_1.default(err) });
        }
    }
    async getAllInterestCMS(req, res) {
        try {
            let interests;
            let { start, end } = req.query;
            if (start || end) {
                start = Number(start);
                end = Number(end);
                assert_1.default.ok((!isNaN(start) || !isNaN(end)), "Query string parameters <start, limit> must be positive integers.");
                assert_1.default.ok(start >= 0, "Query string parameter <skip> must be a positive integer.");
                assert_1.default.ok(end > 0, "Query string parameter <limit> must be a non-zero positive integer.");
                interests = await Interest_1.default.find({}).skip(start).limit(end).lean().exec();
            }
            else {
                interests = await Interest_1.default.find({}).lean().exec();
            }
            interests = await Promise.all(interests.map(async (interest) => {
                let userPreferences = await UserPreference_1.default.count({ interests: { $in: interest === null || interest === void 0 ? void 0 : interest._id } }).lean().exec();
                interest['followersCount'] = userPreferences;
                return interest;
            }));
            return res.status(200).send({ success: true, msg: null, data: interests });
        }
        catch (err) {
            return res.status(400).send({ success: false, "msg": errorFormatter_1.default(err) });
        }
    }
    async getInterestInfo(req, res) {
        var _a, _b, _c, _d, _e;
        let interest;
        try {
            let query = {};
            log("query", query);
            assert_1.default.ok((_a = req === null || req === void 0 ? void 0 : req.params) === null || _a === void 0 ? void 0 : _a.id, "No ID Found.");
            let isValidId = helper_1.validObjectIdRegex((_b = req === null || req === void 0 ? void 0 : req.params) === null || _b === void 0 ? void 0 : _b.id);
            isValidId && (query._id = ObjectId((_c = req === null || req === void 0 ? void 0 : req.params) === null || _c === void 0 ? void 0 : _c.id));
            !isValidId && (query.permalinkName = (_d = req === null || req === void 0 ? void 0 : req.params) === null || _d === void 0 ? void 0 : _d.id);
            let interestExists = await Interest_1.default.exists(query);
            assert_1.default.ok(interestExists, "Interest could not be found with id :" + req.params.id);
            !query.permalinkName && (query._id = ObjectId((_e = req === null || req === void 0 ? void 0 : req.params) === null || _e === void 0 ? void 0 : _e.id));
            interest = await Interest_1.default.findOne(query).lean().exec();
            !(interest === null || interest === void 0 ? void 0 : interest.permalinkName) && (interest["permalinkName"] = null);
            !(interest === null || interest === void 0 ? void 0 : interest.thumbnailUrl) && (interest["thumbnailUrl"] = null);
            return res.status(200).send({ success: true, msg: null, data: interest });
        }
        catch (err) {
            return res.status(400).send({ success: false, "msg": errorFormatter_1.default(err) });
        }
    }
    async deleteInterest(req, res) {
        var _a, _b, _c, _d;
        let interest;
        let userPreference;
        try {
            let query = {};
            assert_1.default.ok(helper_1.validObjectIdRegex((_a = req === null || req === void 0 ? void 0 : req.params) === null || _a === void 0 ? void 0 : _a._id), "Invalid Object ID " + ((_b = req === null || req === void 0 ? void 0 : req.params) === null || _b === void 0 ? void 0 : _b._id));
            let interestExists = await Interest_1.default.exists({ "_id": req.params.id });
            assert_1.default.ok(interestExists, "Interest could not be found with id :" + req.params.id);
            query._id = ObjectId((_c = req === null || req === void 0 ? void 0 : req.params) === null || _c === void 0 ? void 0 : _c.id);
            interest = await Interest_1.default.deleteOne(query).lean().exec();
            userPreference = await UserPreference_1.default.updateMany({ "interests": { "$exists": true } }, { $pull: { "interests": (_d = req === null || req === void 0 ? void 0 : req.params) === null || _d === void 0 ? void 0 : _d.id } }, { upsert: false });
            return res.status(200).send({ success: true, msg: null, data: [] });
        }
        catch (err) {
            return res.status(400).send({ success: false, "msg": errorFormatter_1.default(err) });
        }
    }
    async createInterest(req, res) {
        let interest;
        let payload = {};
        try {
            let { name, permalinkName, longDescription } = req.body;
            let isReqdParamsAvailable = Object.values(AppConstants_1.VALID_INTEREST_ATTRIBUTES).every((k) => { return k in (req === null || req === void 0 ? void 0 : req.body); });
            assert_1.default.ok(isReqdParamsAvailable, "Invalid parameters in request body. Please specify exactly these parameters: " + AppConstants_1.VALID_INTEREST_ATTRIBUTES.NAME);
            let isValidInterest = Object.values(AppConstants_1.VALID_INTERESTS).some(v => v === name);
            assert_1.default.ok(helper_1.validPermalinkName(permalinkName), "permalinkName is not URL safe. You may only use alphanumerics, dashes, and underscores.");
            assert_1.default.ok(isValidInterest, "Parameter name must be a valid interest. Valid interest are " + AppConstants_1.VALID_INTERESTS.AUTOMOTIVE_FINANCE + " or " +
                AppConstants_1.VALID_INTERESTS.BANKING + " or " + AppConstants_1.VALID_INTERESTS.BONDS + " or " + AppConstants_1.VALID_INTERESTS.BUDGETING_SAVINGS + "or" +
                AppConstants_1.VALID_INTERESTS.COMMODITIES + " or " + AppConstants_1.VALID_INTERESTS.ECONOMY_GOVERNMENT + " or " + AppConstants_1.VALID_INTERESTS.ESTATE_PLANNING + "or" +
                AppConstants_1.VALID_INTERESTS.FAMILY_FINANCE + " or " + AppConstants_1.VALID_INTERESTS.FUNDING + " or " + AppConstants_1.VALID_INTERESTS.FUTURE_OPTIONS + "or" +
                AppConstants_1.VALID_INTERESTS.GOLD_INVESTMENTS + " or " + AppConstants_1.VALID_INTERESTS.HOME_OWNERSHIP + " or " + AppConstants_1.VALID_INTERESTS.INSURANCE + "or" +
                AppConstants_1.VALID_INTERESTS.INVESTMENT_PLANNING + " or " + AppConstants_1.VALID_INTERESTS.IPO + " or " + AppConstants_1.VALID_INTERESTS.LOANS + "or" +
                AppConstants_1.VALID_INTERESTS.MARKETS + " or " + AppConstants_1.VALID_INTERESTS.MISCELLANEOUS + " or " + AppConstants_1.VALID_INTERESTS.MUTUAL_FUNDS + "or" +
                AppConstants_1.VALID_INTERESTS.PERSONAL_FINANCE + " or " + AppConstants_1.VALID_INTERESTS.STOCK_MARKETS + " or " + AppConstants_1.VALID_INTERESTS.TAX_PLANNING + "or" + AppConstants_1.VALID_INTERESTS.VALUE_INVESTING + " or "
                + AppConstants_1.VALID_INTERESTS.WEALTH + " or " + AppConstants_1.VALID_INTERESTS.MISCELLANEOUS);
            payload = {
                "name": name,
                "permalinkName": permalinkName
            };
            longDescription && (payload.longDescription = longDescription);
            interest = new Interest_1.default(payload);
            interest = await interest.save();
            return res.status(200).send({ success: true, msg: null, data: interest });
        }
        catch (err) {
            return res.status(400).send({ success: false, msg: errorFormatter_1.default(err) });
        }
    }
    async getFollowedInterest(req, res) {
        let followedInterest;
        try {
            let { userId } = req.query;
            assert_1.default.ok(userId, "No Object ID exist");
            assert_1.default.ok(helper_1.validObjectIdRegex(userId), "Invalid Object ID " + userId);
            let isReqdParamsAvailable = Object.values(AppConstants_1.GET_USERS_FOLLOWED_INTERESTS_REQUIRED_PARAMS).every((k) => { return k in (req === null || req === void 0 ? void 0 : req.query); });
            assert_1.default.ok(isReqdParamsAvailable, "Invalid query string parameters. Please specify exactly these parameters: " + AppConstants_1.GET_USERS_FOLLOWED_INTERESTS_REQUIRED_PARAMS.USER_ID);
            followedInterest = await UserPreference_1.default.findOne({ "_id": req.query.userId }, { "interests": 1 }).lean().exec();
            return res.status(200).send({
                success: true, msg: null,
                data: ((followedInterest === null || followedInterest === void 0 ? void 0 : followedInterest.interests) || [])
            });
        }
        catch (err) {
            return res.status(400).send({ success: false, "msg": errorFormatter_1.default(err) });
        }
    }
    async followUnfollowChannels(req, res) {
        try {
            let { userId, action, channels } = req.body;
            let cond;
            let anotherCond;
            let isReqdParamsAvailable = Object.values(AppConstants_1.ACTIONS_FOLLOW_CHANNELS_REQUIRED_PARAMS).every((k) => { return k in (req === null || req === void 0 ? void 0 : req.body); });
            assert_1.default.ok(isReqdParamsAvailable, `Invalid query string parameters. Please specify exactly these parameters: ${Object.values(AppConstants_1.ACTIONS_FOLLOW_CHANNELS_REQUIRED_PARAMS).join(' or ')}`);
            let isValidAction = Object.values(AppConstants_1.VALID_CHANNEL_ACTIONS).some(v => v === action);
            assert_1.default.ok(isValidAction, `Parameter action must be one of ${Object.values(AppConstants_1.VALID_CHANNEL_ACTIONS).join(' or ')}`);
            let channelsType = typeof channels;
            assert_1.default.ok((channelsType === 'object'), "Parameter <channels> must be a list");
            assert_1.default.ok(!(lodash_1.default.isEmpty(channels)), "Internal server error while performing " + action +
                " channels " + channels + " for userId " + userId);
            let isIdValid = channels.every(function (value) {
                return (helper_1.validObjectIdRegex(value));
            });
            assert_1.default.ok(isIdValid, "Channel Contains Invalid ID or Non exist.");
            let isChannelExist = await Channel_1.default.count({ _id: { "$in": channels } }).lean().exec();
            assert_1.default.ok((isChannelExist === channels.length), "No Channel with id could be found");
            (action === 'follow') ? (cond = { $addToSet: { "following": { "$each": channels } } }) : (cond = { $pull: { "following": { "$in": channels } } });
            let userPreference = await UserPreference_1.default.findOneAndUpdate({ _id: userId }, cond, { upsert: true, new: true }).lean().exec();
            action === "follow" ? anotherCond = { $push: { followers: userId } } : anotherCond = { $pull: { "followers": { "$in": userId } } };
            let finalAns = await Channel_1.default.updateMany({ _id: { $in: channels } }, anotherCond, { upsert: false, new: true }).lean().exec();
            return res.status(200).send({
                success: true, msg: null, data: userPreference
            });
        }
        catch (err) {
            log("Error in follow", err);
            return res.status(400).send({ success: false, "msg": errorFormatter_1.default(err) });
        }
    }
    async userpreferenceInterests(req, res) {
        try {
            let { userId, action, interests } = req.body;
            let condition;
            let isReqdParamsAvailable = Object.values(AppConstants_1.POST_INTERESTS_REQUIRED_PARAMS).every((k) => { return k in (req === null || req === void 0 ? void 0 : req.body); });
            assert_1.default.ok(isReqdParamsAvailable, "Invalid parameters in request body. Please specify exactly these parameters: " + AppConstants_1.POST_INTERESTS_REQUIRED_PARAMS.ACTION +
                " or " + AppConstants_1.POST_INTERESTS_REQUIRED_PARAMS.INTERESTS + " or " + AppConstants_1.POST_INTERESTS_REQUIRED_PARAMS.USER_ID);
            let interestType = typeof interests;
            assert_1.default.ok((interestType === 'object'), "Parameter <interests> must be a list");
            let isValidAction = Object.values(AppConstants_1.VALID_CHANNEL_ACTIONS).some(v => v === action);
            assert_1.default.ok(isValidAction, "Parameter action must be one of " + AppConstants_1.VALID_CHANNEL_ACTIONS.FOLLOW + " or " +
                AppConstants_1.VALID_CHANNEL_ACTIONS.UNFOLLOW);
            let isIdValid = interests.every(function (value) {
                return (helper_1.validObjectIdRegex(value));
            });
            assert_1.default.ok(isIdValid, "Interest ID is not a valid ID.");
            let isinterestExist = await Interest_1.default.count({ _id: { "$in": interests } }).lean().exec();
            assert_1.default.ok((isinterestExist === interests.length), "No Interest with id could be found");
            action === "follow" ? condition = { $addToSet: { "interests": { "$each": interests } } } : condition = { $pull: { "interests": { "$in": interests } } };
            let userPreference = await UserPreference_1.default.findOneAndUpdate({ _id: userId }, condition, { upsert: true, new: true }).lean().exec();
            return res.status(200).send({
                success: true, msg: null, data: userPreference
            });
        }
        catch (err) {
            return res.status(400).send({ success: false, "msg": errorFormatter_1.default(err) });
        }
    }
    async getBookmarks(req, res) {
        try {
            let isReqdParamsAvailable = Object.values(AppConstants_1.GET_USERS_BOOKMARKS_REQUIRED_PARAMS).every((k) => { return k in (req === null || req === void 0 ? void 0 : req.query); });
            assert_1.default.ok(isReqdParamsAvailable, "Invalid query string parameters. Please specify exactly these parameters: " + AppConstants_1.GET_USERS_BOOKMARKS_REQUIRED_PARAMS.USER_ID);
            let userId = req.query.userId;
            assert_1.default.ok(helper_1.validObjectIdRegex(userId), "Invalid userId: " + userId);
            let userPreference = await UserPreference_1.default.findOne({ "_id": userId }, { "bookmarks": 1 }).lean().exec();
            let bookmark = (userPreference === null || userPreference === void 0 ? void 0 : userPreference.bookmarks) ? userPreference.bookmarks : [];
            let medias = await Media_1.default.aggregate([
                {
                    "$match": { "_id": { "$in": bookmark } }
                },
                {
                    "$sort": { "pubDate": -1 }
                },
                {
                    "$lookup": {
                        "from": "channels",
                        "localField": "channel",
                        "foreignField": "_id",
                        "as": "channel"
                    }
                },
                {
                    "$lookup": {
                        "from": "interests",
                        "localField": "interests",
                        "foreignField": "_id",
                        "as": "interests"
                    }
                },
                {
                    "$lookup": {
                        "from": "bookmarks",
                        "localField": "bookmark",
                        "foreignField": "_id",
                        "as": "bookmarks"
                    }
                },
                {
                    "$project": {
                        "_id": 1,
                        "type": 1,
                        "channel": { $arrayElemAt: ["$channel._id", 0] },
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
                        "bookmarks": 1,
                        "permalinkName": 1,
                        "channelThumbnailUrl": { $arrayElemAt: ["$channel.thumbnailUrl", 0] },
                        "channelName": { $arrayElemAt: ["$channel.name", 0] },
                        "channelCountry": { $arrayElemAt: ["$channel.country", 0] }
                    }
                }
            ]);
            return res.status(200).send({
                success: true, msg: null, data: (medias || [])
            });
        }
        catch (err) {
            return res.status(400).send({ success: false, "msg": errorFormatter_1.default(err) });
        }
    }
    async userPreferencesBookmarks(req, res) {
        try {
            let { action, userId, media } = req.body;
            let payload = {};
            let isReqdParamsAvailable = Object.values(AppConstants_1.POST_BOOKMARK_REQUIRED_PARAMS).every((k) => { return k in (req === null || req === void 0 ? void 0 : req.body); });
            assert_1.default.ok(isReqdParamsAvailable, "Invalid parameters in request body. Please specify exactly these parameters: " + AppConstants_1.POST_BOOKMARK_REQUIRED_PARAMS.ACTION +
                " or " + AppConstants_1.POST_BOOKMARK_REQUIRED_PARAMS.MEDIA + " or " + AppConstants_1.POST_BOOKMARK_REQUIRED_PARAMS.USER_ID);
            assert_1.default.ok(helper_1.validObjectIdRegex(media), "Invalid media" + media);
            let isValidAction = Object.values(AppConstants_1.VALID_BOOKMARK_ACTION).some(v => v === action);
            assert_1.default.ok(isValidAction, "Parameter action must be one of " + AppConstants_1.VALID_BOOKMARK_ACTION.ADD + " or " +
                AppConstants_1.VALID_BOOKMARK_ACTION.REMOVE);
            let mediaExists = await Media_1.default.exists({ "_id": media });
            assert_1.default.ok((mediaExists), "media " + media + " does not exist.");
            payload = action === 'add' ? { "$addToSet": { "bookmarks": media } } : { "$pull": { "bookmarks": media } };
            let userPreference = await UserPreference_1.default.findOneAndUpdate({ "_id": userId }, payload, { upsert: true, new: true });
            return res.status(200).send({ success: true, msg: null, data: userPreference });
        }
        catch (err) {
            return res.status(400).send({ success: false, msg: errorFormatter_1.default(err) });
        }
    }
    async updateReaction(req, res) {
        try {
            let condition;
            let anotherCond;
            let isReqdParamsAvailable = Object.values(AppConstants_1.REACTION_REQUIRED_PARAMS).every((k) => { return k in (req === null || req === void 0 ? void 0 : req.body); });
            assert_1.default.ok(isReqdParamsAvailable, "Invalid parameters in request body. Please specify exactly these parameters: " +
                AppConstants_1.REACTION_REQUIRED_PARAMS.USER_ID + " or " + AppConstants_1.REACTION_REQUIRED_PARAMS.MEDIA + " or " + AppConstants_1.REACTION_REQUIRED_PARAMS.ACTION);
            let { userId, media, reaction } = req.body;
            assert_1.default.ok(helper_1.validObjectIdRegex(media), "Invalid " + media + " media .");
            let mediaExists = await Media_1.default.exists({ "_id": media });
            assert_1.default.ok((mediaExists), "media " + media + " does not exist.");
            let isValidReaction = Object.values(AppConstants_1.VALID_REACTIONS).some(v => v === reaction);
            assert_1.default.ok(isValidReaction, "Parameter reaction must be one of " + AppConstants_1.VALID_REACTIONS.ANGRY + " or " +
                AppConstants_1.VALID_REACTIONS.HOT + " or " + AppConstants_1.VALID_REACTIONS.LOVE + " or " + AppConstants_1.VALID_REACTIONS.SAD + " or " + AppConstants_1.VALID_REACTIONS.SMILE);
            let react = Object.values(AppConstants_1.VALID_REACTIONS).some(v => v === reaction);
            (react) &&
                (condition = { "$addToSet": { [reaction]: media } }, anotherCond = { "$addToSet": { [reaction]: userId } });
            Object.values(AppConstants_1.VALID_REACTIONS).forEach(async function (element) {
                console.log("element---->>", element);
                let pulluserPreferenceReactions = await UserPreference_1.default.findOneAndUpdate({ _id: userId }, { "$pull": { [element]: media } }, { upsert: true, new: true });
                let pullmediaReactions = await Media_1.default.findOneAndUpdate({ _id: media }, { "$pull": { [element]: userId } }, { upsert: false, new: true });
            });
            let userPreferenceReactions = await UserPreference_1.default.findOneAndUpdate({ _id: userId }, condition, { upsert: true, new: true });
            let mediaReactions = await Media_1.default.findOneAndUpdate({ _id: media }, anotherCond, { upsert: false, new: true });
            let updatedData = await Media_1.default.findOne({ "_id": media }, { "cleanedRawContent": 0, "tags": 0 });
            return res.status(200).send({ success: true, msg: null, data: updatedData });
        }
        catch (err) {
            return res.status(400).send({ success: false, msg: errorFormatter_1.default(err) });
        }
    }
    async editMedia(req, res) {
        var _a;
        try {
            let { blocked, hashtags, permalinkName, longDescription } = req === null || req === void 0 ? void 0 : req.body;
            let _id = (_a = req === null || req === void 0 ? void 0 : req.params) === null || _a === void 0 ? void 0 : _a._id;
            assert_1.default.ok(_id, `Media id ${_id} does not exist.`);
            assert_1.default.ok(helper_1.validObjectIdRegex(_id), `Invalid Object ID ${_id})`);
            assert_1.default.ok(helper_1.validPermalinkName(permalinkName), "permalinkName is not URL safe. You may only use alphanumerics, dashes, and underscores.");
            let mediaExists = await Media_1.default.exists({});
            assert_1.default.ok(mediaExists, `Media id ${_id} does not exist.`);
            let isValidAttributes = Object.keys(req === null || req === void 0 ? void 0 : req.body).every((k) => { return k in AppConstants_1.VALID_MEDIA_ATTRIBUTES; });
            assert_1.default.ok(isValidAttributes, `Invalid parameters in request body. Only the following attributes are valid: ${Object.values(AppConstants_1.VALID_MEDIA_ATTRIBUTES).join(' or ')}`);
            assert_1.default.ok(typeof blocked === "boolean", `Attribute 'blocked' must be a boolean.`);
            if (hashtags) {
                assert_1.default.ok(lodash_1.default.isArray(hashtags), `Attribute 'hashtags' must be a list.`);
            }
            let media = await Media_1.default.findOneAndUpdate({ _id: ObjectId(_id) }, { $set: req === null || req === void 0 ? void 0 : req.body }, { new: true }).lean().exec();
            return res.status(200).send({ success: true, msg: null, data: media });
        }
        catch (err) {
            return res.status(400).send({ success: false, msg: errorFormatter_1.default(err) });
        }
    }
    async newestMediaAggES(mediaType, country, limit, otherOptions) {
        var _a;
        let otherFilters = {
            "mustNot": [
                {
                    "match": {
                        "document.blocked": true
                    }
                },
                {
                    "match": {
                        "document.channelBlocked": true
                    }
                }
            ],
            "must": [
                {
                    "match": {
                        "document.channelCountry": country
                    }
                }
            ]
        };
        let fetchLast24Hrs = (otherOptions === null || otherOptions === void 0 ? void 0 : otherOptions.isAllMediaType) && (mediaType !== AppConstants_1.FEED_MEDIA_TYPES.SNIP && mediaType !== AppConstants_1.FEED_MEDIA_TYPES.PODCAST);
        fetchLast24Hrs && ((_a = otherFilters.must) === null || _a === void 0 ? void 0 : _a.push({
            "range": {
                "document.pubDate": {
                    "gte": date_fns_1.subHours(new Date(), 24)
                }
            }
        }));
        let records = await this.elasticSearch({
            type: AppConstants_1.KOPPR_SEARCH_INDEX_PREFIX.MEDIA, country, otherFilters, mediaType, limit, sort: [{
                    "document.pubDate": { "order": "desc" }
                }]
        });
        return records;
    }
    async mediaFromKopprSourcesAggES(mediaType, country, limit, otherOptions) {
        let kopprChannelIds = await this.getKopprChannelIds();
        let otherFilters = {
            "mustNot": [
                {
                    "match": {
                        "document.blocked": true
                    }
                },
                {
                    "match": {
                        "document.channelBlocked": true
                    }
                }
            ],
            "must": [
                {
                    "match": {
                        "document.channelCountry": country
                    }
                }
            ]
        };
        (kopprChannelIds && (kopprChannelIds === null || kopprChannelIds === void 0 ? void 0 : kopprChannelIds.length) > 0) && (otherFilters["filter"] = {
            "terms": {
                "document.channel": kopprChannelIds
            }
        });
        let records = await this.elasticSearch({
            type: AppConstants_1.KOPPR_SEARCH_INDEX_PREFIX.MEDIA, country, otherFilters, mediaType, limit, sort: [{
                    "document.pubDate": { "order": "desc" }
                }]
        });
        return records;
    }
    async getChannelsByPermalink(req, res) {
        var _a, _b, _c, _d;
        try {
            let isValidAttributes = Object.values(AppConstants_1.GET_CHANNELS_REQUIRED_PERMALINK_ARGS).every((k) => { return k in (req === null || req === void 0 ? void 0 : req.body); });
            assert_1.default.ok(isValidAttributes, `Invalid query string parameters.Please specify exactly these parameters: ${Object.values(AppConstants_1.GET_CHANNELS_REQUIRED_PERMALINK_ARGS).join(' or ')}`);
            let permalinkName = lodash_1.default.last((_b = (_a = req === null || req === void 0 ? void 0 : req.body) === null || _a === void 0 ? void 0 : _a.permalinkName) === null || _b === void 0 ? void 0 : _b.split('/'));
            let start = Number((_c = req === null || req === void 0 ? void 0 : req.body) === null || _c === void 0 ? void 0 : _c.start);
            let end = Number((_d = req === null || req === void 0 ? void 0 : req.body) === null || _d === void 0 ? void 0 : _d.end);
            assert_1.default.ok((!isNaN(start) || !isNaN(end)), "Query string parameters <start, end> must be integers.");
            assert_1.default.ok(start < end, "Query string parameter <start> must be less than <end>.");
            assert_1.default.ok(start >= 0, "start variable should be a positive integer");
            assert_1.default.ok(end > 0, "end variable should be a positive integer");
            let filters = [];
            permalinkName && (filters.push({
                "term": {
                    "document.permalinkName.keyword": permalinkName
                }
            }));
            let records = await this.elasticSearch({
                type: AppConstants_1.KOPPR_SEARCH_INDEX_PREFIX.CHANNEL, otherFilters: {
                    "must": filters
                }, limit: 1
            });
            let channel = lodash_1.default.first(records);
            assert_1.default.ok(channel, "Permalink Name is not Found in database.");
            let medias = await this.elasticSearch({
                type: AppConstants_1.KOPPR_SEARCH_INDEX_PREFIX.MEDIA,
                otherFilters: {
                    "must": [
                        {
                            "match": {
                                "document.channel": channel === null || channel === void 0 ? void 0 : channel._id
                            }
                        }
                    ]
                },
                skip: start, limit: end
            });
            return res.status(200).send({ success: true, msg: null, data: medias });
        }
        catch (err) {
            return res.status(400).send({ success: false, msg: errorFormatter_1.default(err) });
        }
    }
    async editInterest(req, res) {
        try {
            let { _id } = req.params;
            let { longDescription } = req.body;
            assert_1.default.ok(helper_1.validPermalinkName(req.body.permalinkName), "permalinkName is not URL safe. You may only use alphanumerics, dashes, and underscores.");
            let allowedEditInterest = lodash_1.default.pick(req.body, Object.values(AppConstants_1.EDIT_INTEREST_VALID_PARAMETERS));
            (Object.keys(req === null || req === void 0 ? void 0 : req.body).length > Object.keys(allowedEditInterest).length) && res.status(400).send({
                "msg": "Invalid parameters passes. Valid Parameters are :" + AppConstants_1.EDIT_INTEREST_VALID_PARAMETERS.PERMALINK_NAME + "or" +
                    AppConstants_1.EDIT_INTEREST_VALID_PARAMETERS.NAME
                    + "or " + AppConstants_1.EDIT_INTEREST_VALID_PARAMETERS.THUMBNAIL_URL
                    + "or " + AppConstants_1.EDIT_INTEREST_VALID_PARAMETERS.LONG_DESCRIPTION
                    + "or " + AppConstants_1.EDIT_INTEREST_VALID_PARAMETERS.DESCRIPTION
            });
            assert_1.default.ok(helper_1.validObjectIdRegex(_id), "Invalid Object ID " + _id);
            let interestExists = await Interest_1.default.exists({ "_id": _id });
            assert_1.default.ok((interestExists), "Interest could not be found with id :" + _id);
            let query = {};
            query._id = ObjectId(_id);
            let editField = allowedEditInterest;
            let interest = await Interest_1.default.findOneAndUpdate(query, editField, { upsert: false, new: true }).exec();
            return res.status(200).send({ success: true, msg: null, data: interest });
        }
        catch (err) {
            return res.status(400).send({ success: false, msg: errorFormatter_1.default(err) });
        }
    }
    validateArgumentsOverall(req) {
        var _a;
        let isValidAttributes = Object.values(AppConstants_1.OVERALL_SEARCH_VALID_PARAMS).every((k) => { return k in (req === null || req === void 0 ? void 0 : req.query); });
        assert_1.default.ok(isValidAttributes, `Invalid query string parameters.Please specify exactly these parameters: ${Object.values(AppConstants_1.OVERALL_SEARCH_VALID_PARAMS).join(' or ')}`);
        let { query, country, mediaType, skip, limit } = req === null || req === void 0 ? void 0 : req.query;
        skip = Number(skip);
        limit = Number(limit);
        assert_1.default.ok((!isNaN(skip) || !isNaN(limit)), "Query string parameters <skip, limit> must be positive integers.");
        assert_1.default.ok(skip >= 0, "Query string parameter <skip> must be a positive integer.");
        assert_1.default.ok(limit > 0, "Query string parameter <limit> must be a non-zero positive integer.");
        assert_1.default.ok(((country === null || country === void 0 ? void 0 : country.length) === 2), `Parameter <country> must be a valid two-digit ISO country code.`);
        let validMediaType = (_a = Object.values(AppConstants_1.VALID_MEDIA_TYPES)) === null || _a === void 0 ? void 0 : _a.some(v => v === mediaType);
        assert_1.default.ok(validMediaType, `Query string parameter <mediaType> must be one of ${Object.values(AppConstants_1.VALID_MEDIA_TYPES).join(' or ')}`);
        country !== 'all' && (country = country === null || country === void 0 ? void 0 : country.toUpperCase());
        return { query, country, mediaType, skip, limit };
    }
    validateArgumentsChannels(req) {
        let isValidAttributes = Object.values(AppConstants_1.CHANNEL_SEARCH_VALID_PARAMS).every((k) => { return k in (req === null || req === void 0 ? void 0 : req.query); });
        assert_1.default.ok(isValidAttributes, `Invalid query string parameters.Please specify exactly these parameters: ${Object.values(AppConstants_1.CHANNEL_SEARCH_VALID_PARAMS).join(' or ')}`);
        let { query, country, skip, limit } = req === null || req === void 0 ? void 0 : req.query;
        skip = Number(skip);
        limit = Number(limit);
        skip = Number(skip) || 0;
        limit = Number(limit) || 100;
        assert_1.default.ok(((country === null || country === void 0 ? void 0 : country.length) === 2), `Parameter <country> must be a valid two-digit ISO country code`);
        country !== 'all' && (country = country === null || country === void 0 ? void 0 : country.toUpperCase());
        return { query, country, skip, limit };
    }
    validateArgumentsInterests(req) {
        let isValidAttributes = Object.values(AppConstants_1.INTEREST_SEARCH_VALID_PARAMS).every((k) => { return k in (req === null || req === void 0 ? void 0 : req.query); });
        assert_1.default.ok(isValidAttributes, `Invalid query string parameters.Please specify exactly these parameters: ${Object.values(AppConstants_1.INTEREST_SEARCH_VALID_PARAMS).join(' or ')}`);
        let { query, skip, limit } = req === null || req === void 0 ? void 0 : req.query;
        skip = Number(skip) || 0;
        limit = Number(limit) || 100;
        return { query, skip, limit };
    }
    getInterestsAggQuery(query, skip, limit) {
        return [
            {
                "$match": {
                    "$text": { "$search": query }
                }
            },
            { "$sort": { "score": { "$meta": "textScore" }, "pubDate": -1 } },
            { "$skip": skip },
            { "$limit": limit },
            {
                "$project": {
                    "name": true,
                    "permalinkName": true,
                    "score": { "$meta": "textScore" }
                }
            }
        ];
    }
    getChannelsAggQuery(query, country, skip, limit) {
        country = country.toLowerCase() == "all" ? { "$exists": true } : { "$eq": country };
        return [
            {
                "$match": {
                    country,
                    "$text": { "$search": query },
                    "blocked": false
                }
            },
            { "$sort": { "score": { "$meta": "textScore" } } },
            { "$skip": skip },
            { "$limit": limit },
            {
                "$project": Object.assign(Object.assign({}, Channel_1.fieldSet), { "score": { "$meta": "textScore" } })
            }
        ];
    }
}
exports.default = RestController;
