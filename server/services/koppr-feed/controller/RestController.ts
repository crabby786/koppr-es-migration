import assert from "assert";
import { convertStringToBoolean, descriptionConverter, Logger, validObjectIdRegex, validPermalinkName, validURL } from "../../../utils/helper";
import errorFormatterService from "../lib/errorFormatter";
import { errorFormatter } from "../../../utils/helper/ErrorHandler";
import { addDays, subHours, subMonths } from 'date-fns';

import Media, { fieldSet as MediaFieldset } from "../model/db-schemas/Media";
import Channel, {
    fieldSet as ChannelFieldset,
} from "../model/db-schemas/Channel";
import Source from "../model/db-schemas/Source";
import {
    VALID_CHANNEL_ACTIONS, ROLES, ACTIONS_FOLLOW_CHANNELS_REQUIRED_PARAMS, ADD_CHANNEL_PARAMETERS, GET_RECOMMENDATION_CHANNELS_REQUIRED_PARAMS, GET_CHANNELS_REQUIRED_PARAMS, GET_USERS_FOLLOWED_INTERESTS_REQUIRED_PARAMS,
    POST_INTERESTS_REQUIRED_PARAMS, GET_SOURCES_REQUIRED_PARAMS, VALID_MEDIA_TYPES, EDIT_SOURCE_PARAMETERS, VALID_INTEREST_ATTRIBUTES, VALID_INTERESTS,
    EDIT_CHANNEL_PARAMETERS, GET_USERS_BOOKMARKS_REQUIRED_PARAMS, POST_BOOKMARK_REQUIRED_PARAMS, VALID_BOOKMARK_ACTION, VALID_REACTIONS,
    REACTION_REQUIRED_PARAMS, FEEDBACK_REQUIRED_PARAMS, ADD_REQUIRED_SOURCE, VALID_MEDIA_ATTRIBUTES, GET_ALL_MEDIA_REQUIRED_ARGS, GET_RECOMMENDATION_MEDIA_REQUIRED_ARGS,
    VALID_MEDIA_TYPES_FOR_INTEREST,
    ERROR_CODES, GET_MEDIA_REQUIRED_ARGS, GET_CHANNELS_REQUIRED_PERMALINK_ARGS, OVERALL_SEARCH_VALID_PARAMS, CHANNEL_SEARCH_VALID_PARAMS, INTEREST_SEARCH_VALID_PARAMS, EDIT_INTEREST_VALID_PARAMETERS, GET_RECENT_MEDIAS_BY_CHANNEL, GET_RECENT_MEDIAS_BY_INTEREST, GET_TRENDING_MEDIAS_BY_INTEREST, GET_TRENDING_MEDIAS_BY_CHANNEL, GET_RECENT_MEDIAS, GET_TRENDING_MEDIAS, KOPPR_SEARCH_INDEX_PREFIX, FEED_MEDIA_TYPES, GUEST_USER
} from "../../../lib/AppConstants";
import mongoose from "mongoose";
import _ from "lodash";
import Interest from "../model/db-schemas/Interest";
import UserPreference from "../model/db-schemas/UserPreference";
import { validISOCode } from "../../../utils/helper/index";
import { ESClient } from "../lib/ElasticSearch/ESClient";
import { Client } from "@elastic/elasticsearch";

const ObjectId = mongoose.Types.ObjectId;
const log = Logger.log;

export default class RestController {
    params: any

    constructor(params: any) {
        this.params = params;
        this.ingestedMediaStats = this.ingestedMediaStats.bind(this);
        this.getMediaCountStats = this.getMediaCountStats.bind(this);
    }

    async test(res: any) {
        res.status(200).send("Feed Rest Controller Routes working!");
    }

    async getMediaById(req: any, res: any) {
        try {
            const _id = req?.params?._id;
            assert.ok(_id, ERROR_CODES.E5005);

            let media: any = await Media.findOne({ _id }).populate('channel').populate({ path: 'interests', model: 'interests' }).lean().exec();
            assert.ok(media, ERROR_CODES.E5021);

            let channel: any = media?.channel;

            media = {
                "channelCountry": channel?.country,
                "channel": channel?._id,
                "channelName": channel?.name,
                "channelThumbnailUrl": channel?.thumbnailUrl,
                "_id": media?._id,
                "angry": media?.angry,
                "description": media?.description,
                "hot": media?.hot,
                "interests": media?.interests,
                "love": media?.love,
                "pubDate": media?.pubDate,
                "sad": media?.sad,
                "smile": media?.smile,
                "permalinkName": media?.permalinkName,
                "thumbnailUrl": media?.thumbnailUrl,
                "title": media?.title,
                "type": media?.type,
                "longDescription": media?.longDescription,
                "url": media?.url
            }

            res.status(200).send({
                success: true,
                media
            })
        } catch (err) {
            res.status(400).send(errorFormatter(err));
        }

    }

    async getSources(req: any, res: any) {
        let payload: any = null;
        let sources: any
        let query: any = {};

        try {
            payload = req.query;
            let mediaType = payload.mediaType;

            let isReqdParamsAvailable = Object.values(GET_SOURCES_REQUIRED_PARAMS).every((k) => { return k in req?.query });

            assert.ok(isReqdParamsAvailable, "Invalid parameters in request body. Please specify exactly these parameters: " +
                GET_SOURCES_REQUIRED_PARAMS.MEDIA_TYPE)

            let isValidType = Object.values(VALID_MEDIA_TYPES).some(v => v === mediaType);

            assert.ok(isValidType, `Parameter mediaType must be one of ${Object.values(VALID_MEDIA_TYPES).join(' or ')}`);

            mediaType === 'video' && (mediaType = "youtube");

            query.type = mediaType === 'all' ? { "$exists": true } : { "$eq": mediaType };

            req.query?.channel && (query.channel = req.query?.channel);

            sources = await Source.find(query).lean().exec();
            return res.status(200).send({ success: true, msg: null, data: sources });

        } catch (err) {
            return res.status(400).send({ success: false, "msg": errorFormatterService(err) });
        }
    }

    async editSource(req: any, res: any) {

        try {
            let sources: any;

            let reqBodyKeys = Object.keys(req?.body);

            let allowedEditSource = _.pick(req.body, Object.values(EDIT_SOURCE_PARAMETERS));

            (reqBodyKeys.length > Object.keys(allowedEditSource).length) && res.status(400).send({
                "msg": `Invalid parameters passes. Valid Parameters are : ${Object.values(EDIT_SOURCE_PARAMETERS).join(' or ')}`
            });

            assert.ok(validObjectIdRegex(req.params._id), "Invalid Object ID " + req.params._id);

            let sourceExists: any = await Source.exists({ "_id": req.params._id });

            assert.ok(sourceExists, "Source could not be found with id :" + req.params._id);

            let payload = {};
            payload['_id'] = req.params._id

            let query: any = {}
            query._id = payload['_id'];

            allowedEditSource.mediaType = allowedEditSource.mediaType === 'video' ? 'youtube' : allowedEditSource.mediaType;

            (allowedEditSource?.hasOwnProperty('ingestionActive')) && (payload['ingestionActive'] = allowedEditSource.ingestionActive);
            (allowedEditSource?.name) && (payload['name'] = allowedEditSource.name);
            (allowedEditSource?.channel) && (payload['channel'] = allowedEditSource.channel);
            (allowedEditSource?.mediaType) && (payload['type'] = allowedEditSource.mediaType);
            (allowedEditSource?.url) && (payload['url'] = allowedEditSource.url);

            let editField = payload;

            sources = await Source.findOneAndUpdate(query, editField, { upsert: false, new: true }).exec();
            return res.status(200).send({ success: true, msg: null, data: sources });

        } catch (err) {
            return res.status(400).send({ success: false, "msg": errorFormatterService(err) });
        }
    }

    async addSource(req: any, res: any) {
        let sources: any;

        try {
            let payload: any = {};

            let { url, name, mediaType: type, ingestionActive, channel } = req.body;

            let isReqdParamsAvailable = Object.values(ADD_REQUIRED_SOURCE).every((k) => { return k in req?.body });

            assert.ok(isReqdParamsAvailable, `Invalid parameters. Please specify exactly these parameters: ${Object.values(ADD_REQUIRED_SOURCE).join(' or ')}`);

            assert.ok(url || type, "Invalid query string parameters. Please specify url, mediaType");

            assert.ok(validURL(url), "Parameter url must be a valid URL.");

            (url.substr(url.length - 1) === '/') ? (payload['url'] = url.substring(0, url.length - 1)) : (payload['url'] = url);

            let urlExists: any = await Source.exists({ "url": url });

            assert.ok(!(urlExists), "Source with url " + payload['url'] + " already exists.")

            let isValidType = Object.values(VALID_MEDIA_TYPES).some(v => v === type);

            assert.ok(isValidType, `Query String Parameter mediaType must be one of ${Object.values(VALID_MEDIA_TYPES).join(' or ')}`);

            type === 'video' && (type = 'youtube');
            payload['type'] = type;

            (name) && (payload['name'] = name);
            channel && (payload['channel'] = channel);

            (ingestionActive || !ingestionActive) && (payload['ingestionActive'] = ingestionActive);

            sources = new Source(payload);
            sources = await sources.save();
            return res.status(200).send({ success: true, msg: null, data: sources });

        } catch (err) {
            return res.status(400).send({ success: false, "msg": errorFormatterService(err) });
        }
    }

    getSourceById = async (req: any, res: any) => {

        try {
            let query: any = {};

            let _id = req.params._id;

            assert.ok(validObjectIdRegex(_id), "Invalid Source Id " + _id);

            query._id = ObjectId(_id);

            let source: any = await Source.findOne(query).lean().exec();
            assert.ok(source, "Source not found for id :" + req.params._id);

            return res.status(200).send({ success: true, msg: null, data: source });

        } catch (err) {
            return res.status(400).send({ success: false, msg: errorFormatterService(err) });
        }
    }

    getChannels = async (req: any, res: any) => {
        try {
            let { country, start, end, mediaType } = req.query;
            let query: any = {
                "blocked": false
            };
            let querySource: any = {};

            start = Number(req?.query?.start) || 0;
            end = Number(req?.query?.end) || 10000;

            let isReqdParamsAvailable = Object.values(GET_CHANNELS_REQUIRED_PARAMS).every((k) => { return k in req?.query });
            assert.ok(isReqdParamsAvailable, `Invalid query string parameters. Please specify exactly these parameters: ${Object.values(GET_CHANNELS_REQUIRED_PARAMS).join(' or ')}`);

            // Media type validation
            if (mediaType) {
                let validMediaType = Object.values(VALID_MEDIA_TYPES_FOR_INTEREST)?.some(v => v === mediaType);
                assert.ok(validMediaType, `Query string parameter <mediaType> must be one of ${Object.values(VALID_MEDIA_TYPES_FOR_INTEREST).join(' or ')}`);
            }
            mediaType === 'video' && (mediaType = "youtube");

            if (mediaType) { querySource = mediaType !== 'all' ? { "sources.type": { "$eq": mediaType } } : {} } else { querySource = {} }

            if (country) {
                query.country = country?.toUpperCase()
                assert.ok(country.length === 2, "Parameter country must be a valid two-digit ISO country code.")
            }
            if (start || end) {
                assert.ok((!isNaN(start) || !isNaN(end)), "Query string parameters <start, limit> must be positive integers.");
                assert.ok(start >= 0, "Query string parameter <skip> must be a positive integer.");
                assert.ok(end > 0, "Query string parameter <limit> must be a non-zero positive integer.");
            }
            let sources: any = await this.elasticSearch({
                type: KOPPR_SEARCH_INDEX_PREFIX.SOURCE, otherFilters: {
                    "must": [{
                        "exists": {
                            "field": "document.channel"
                        }
                    }]
                }, mediaType, skip: start, limit: end
            });

            // Remove duplicate channel id's
            let channelIds: any = _.uniqBy(sources, (s: any) => s?.channel).map((c: any) => c?.channel);

            let channels: any = await this.elasticSearch({
                type: KOPPR_SEARCH_INDEX_PREFIX.CHANNEL, otherFilters: {
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
                let totalPosts = await Media.count({ channel: channel?._id, blocked:false}).lean().exec();
                channel['totalPosts'] = totalPosts;
                return channel;
            }));

            return res.status(200).send({ success: true, msg: null, data: channels });
        } catch (err) {
            return res.status(400).send({ success: false, "msg": errorFormatterService(err) });
        }
    }

    async getChannelsCms(req: any, res: any) {
        try {
            let channels: any;
            let { start, end, country } = req.query;
            let query: any = {};

            // let mediaType = req.query.mediaType;
            start = Number(start);
            end = Number(end);

            let isReqdParamsAvailable = Object.values(GET_CHANNELS_REQUIRED_PARAMS).every((k) => { return k in req?.query });
            assert.ok(isReqdParamsAvailable, `Invalid query string parameters. Please specify exactly these parameters: ${Object.values(GET_CHANNELS_REQUIRED_PARAMS).join(' or ')}`);

            if (country) {
                query.country = country.toUpperCase()
                assert.ok(country.length === 2, "Parameter country must be a valid two-digit ISO country code, or 'all'.");
            }

            if (start || end) {
                assert.ok((!isNaN(start) || !isNaN(end)), "Query string parameters <start, limit> must be positive integers.");
                assert.ok(start >= 0, "Query string parameter <skip> must be a positive integer.");
                assert.ok(end > 0, "Query string parameter <limit> must be a non-zero positive integer.");
                channels = await Channel.find(query).sort({ "createdAt": -1 }).skip(start).limit(end).exec();
            }
            else {
                channels = await Channel.find(query).sort({ "createdAt": -1 }).exec();
            }

            return res.status(200).send({ success: true, msg: null, data: channels });
        } catch (err) {
            return res.status(400).send({ success: false, "msg": errorFormatterService(err) });
        }
    }

    async getMediaCountStats(req: any, res: any) {
        try {
            let totalMedias: any = await Media.countDocuments();
            let totalChannels: any = await Channel.countDocuments();
            let totalInterests: any = await Interest.countDocuments();
            let totalSources: any = await Source.countDocuments();

            let stats: any = [
                { "name": "Channels", "value": totalChannels, "description": "Total Available Channels" },
                { "name": "Sources", "value": totalSources, "description": "Total Available Sources" },
                { "name": "Interests", "value": totalInterests, "description": "Total Available Interests" },
                { "name": "Medias", "value": totalMedias, "description": "Total Available Medias" }
            ];

            return res.status(200).send({
                success: true, msg: null, data: stats
            });
        } catch (err) {
            log("Error in getMediaCountStats(): ", err);
            return res.status(400).send({ success: false, "msg": errorFormatterService(err) });
        }
    }

    async ingestedMediaStats(req: any, res: any) {
        try {
            let { fromDate, toDate } = req.query;
            let query: any = {};

            // Date Range Filter
            if (fromDate || toDate) {
                const fromDateObj = new Date(fromDate);
                const toDateObj = new Date(toDate);
                toDateObj.setHours(23, 59, 59, 999);
                query.pubDate = { $gte: fromDateObj, $lte: toDateObj };
            }

            let stats: any = await Media.aggregate(this.ingestedMediaAggregation(query)).allowDiskUse(true).exec();

            return res.status(200).send({
                success: true, msg: null, data: {
                    ingestionStats: stats
                }
            });
        } catch (err) {
            return res.status(400).send({ success: false, "msg": errorFormatterService(err) });
        }
    }

    ingestedMediaAggregation(query: any = {}) {

        // Filter all from other Media types
        let allowedMediaTypes = Object.values(FEED_MEDIA_TYPES).filter((at: any) => {
            return at !== FEED_MEDIA_TYPES.ALL;
        });


        let addFields: any = {};

        allowedMediaTypes?.map((t: any) => {

            addFields[t] = {
                $size: {
                    $filter: {
                        input: "$allMediaTypes",
                        as: 'type',
                        cond: { $eq: ["$$type", t] }
                    }
                }
            }
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

    /**
     * @description Used for sitemap generation
     */
    listMedias = async (req: any, res: any) => {
        try {
            let filters: any = [];
            let { start, end, fromDate, toDate, mediaType } = req.query;

            // Filters
            (fromDate && toDate) && filters.push({
                "range": {
                    "document.pubDate": {
                        "gte": new Date(fromDate),
                        "lt": new Date(toDate)
                    }
                }
            });

            let medias = await this.elasticSearch({
                type: KOPPR_SEARCH_INDEX_PREFIX.MEDIA, otherFilters: {
                    "must": filters
                }, limit: end || 10000, skip: start, mediaType, sort: [{
                    "document.pubDate": { "order": "desc" }
                }]
            });

            medias = descriptionConverter(medias);
            medias = medias || [];

            return res.status(200).send({ success: true, msg: null, data: medias });

        } catch (err) {
            return res.status(400).send({ success: false, msg: errorFormatterService(err) });
        }
    }

    getMediasCms = async (req: any, res: any) => {
        try {

            let query: any = {};
            let { start, end, fromDate, toDate, mediaType } = req.query;

            let isValidAttributes = Object.values(GET_MEDIA_REQUIRED_ARGS).every((k) => { return k in req?.query });
            assert.ok(isValidAttributes, `Invalid query string parameters.Please specify exactly these parameters: ${Object.values(GET_MEDIA_REQUIRED_ARGS).join(' or ')}`);

            // Pagination
            start = Number(start);
            end = Number(end);

            // Filters
            fromDate && (query.pubDate = { $gte: new Date(fromDate) });
            toDate && (query.pubDate = { ...query?.pubDate, $lte: addDays(new Date(toDate), 2) });
            query.type = mediaType === 'all' ? { "$exists": true } : { "$eq": mediaType };

            assert.ok((!isNaN(start) || !isNaN(end)), "Query string parameters <start, limit> must be positive integers.");
            assert.ok(start >= 0, "Query string parameter <skip> must be a positive integer.");
            assert.ok(end > 0, "Query string parameter <limit> must be a non-zero positive integer.");

            let media = await Media.aggregate([
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
                    "$project": {
                        ...MediaFieldset,
                        "tags": 1,
                        "cleanedRawContent": 1,
                        "hashtags": 1,
                        "blocked": 1,
                        "nlpDescription": 1,
                        "authors": 1
                    }
                },

            ]).allowDiskUse(true).exec();

            media = descriptionConverter(media);

            media = media || [];

            return res.status(200).send({ success: true, msg: null, data: media });

        } catch (err) {
            return res.status(400).send({ success: false, msg: errorFormatterService(err) });
        }
    }
    
    getMediasNoAuth = async (req: any, res: any) => {
        try {

            let query: any = {};
            let { start, end, fromDate, toDate, mediaType } = req.query;

            let isValidAttributes = Object.values(GET_MEDIA_REQUIRED_ARGS).every((k) => { return k in req?.query });
            assert.ok(isValidAttributes, `Invalid query string parameters.Please specify exactly these parameters: ${Object.values(GET_MEDIA_REQUIRED_ARGS).join(' or ')}`);

            // Pagination
            start = Number(start);
            end = Number(end);

            // Filters
            fromDate && (query.pubDate = { $gte: new Date(fromDate) });
            toDate && (query.pubDate = { ...query?.pubDate, $lte: addDays(new Date(toDate), 2) });
            query.type = mediaType === 'all' ? { "$exists": true } : { "$eq": mediaType };

            assert.ok((!isNaN(start) || !isNaN(end)), "Query string parameters <start, limit> must be positive integers.");
            assert.ok(start >= 0, "Query string parameter <skip> must be a positive integer.");
            assert.ok(end > 0, "Query string parameter <limit> must be a non-zero positive integer.");

            let media = await Media.aggregate([
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
                    "$project": {
                        ...MediaFieldset,
                        "tags": 1,
                        "cleanedRawContent": 1,
                        "hashtags": 1,
                        "blocked": 1,
                        "nlpDescription": 1,
                        "authors": 1
                    }
                },

            ]).allowDiskUse(true).exec();

            media = descriptionConverter(media);

            media = media || [];

            return res.status(200).send({ success: true, msg: null, data: media });

        } catch (err) {
            return res.status(400).send({ success: false, msg: errorFormatterService(err) });
        }
    }

    async addChannel(req: any, res: any) {
        try {
            let channel: any;

            assert.ok(validPermalinkName(req.body.permalinkName), "permalinkName is not URL safe. You may only use alphanumerics, dashes, and underscores.");

            let channelExists: any = await Channel.exists({ permalinkName: req.body.permalinkName });

            assert.ok(!channelExists, "Channel with same permalink already exists");

            let reqBodyKeys = Object.keys(req?.body);
            var allowedParams = Object.values(EDIT_CHANNEL_PARAMETERS);

            let payload = _.pick(req.body, allowedParams);


            (reqBodyKeys.length > Object.keys(payload)?.length) && res.status(400).send({
                "msg": `Invalid parameters passed. Valid Parameters are : ${Object.values(ADD_CHANNEL_PARAMETERS).join(' or ')}`
            });
            channel = new Channel(payload);
            channel = await channel.save();

            return res.status(200).send({ success: true, msg: null, data: channel });
        } catch (err) {
            return res.status(400).send({ success: false, "msg": errorFormatterService(err) });
        }
    }

    async editChannel(req: any, res: any) {
        try {
            let channels: any;
            let query: any = {};

            query._id = ObjectId(req.params._id);

            assert.ok(validObjectIdRegex(req?.params?._id), "Channel Id " + req?.params?._id + " does not exist.");

            let channelExists: any = await Channel.exists({ "_id": req.params._id });
            assert.ok(channelExists, "Channel could not be found with id :" + req.params._id)

            assert.ok(validPermalinkName(req.body.permalinkName), "permalinkName is not URL safe. You may only use alphanumerics, dashes, and underscores.");

            let reqBodyKeys = Object.keys(req?.body);
            let allowedParams = Object.values(EDIT_CHANNEL_PARAMETERS);

            let allowedEditChannel = _.pick(req.body, allowedParams);

            (reqBodyKeys.length > Object.keys(allowedEditChannel).length) && res.status(400).send({
                "msg": `Invalid parameters passes. Valid Parameters are : ${Object.values(EDIT_CHANNEL_PARAMETERS).join(' or ')}`
            });

            let editField = allowedEditChannel;

            channels = await Channel.findOneAndUpdate(query, editField, { upsert: false, new: true }).exec();

            return res.status(200).send({ success: true, msg: null, data: channels });
        } catch (err) {
            return res.status(400).send({ success: false, "msg": errorFormatterService(err) });
        }
    }

    getChannelInfo = async (req: any, res: any) => {
        try {
            let { type, start, end, otherOptions } = req.query;

            let filters: any = [];

            assert.ok(req?.params?._id, "ID does not exist");
            let _id = req?.params?._id;

            let query: any = { blocked: false }
            let isValidId = validObjectIdRegex(_id);

            isValidId && (query._id = ObjectId(req?.params?._id));
            !isValidId && (query.permalinkName = req?.params?._id);

            let channelExists: any = await Channel.exists(query);
            assert.ok(channelExists, "Channel could not be found with id :" + _id);

            // Pagination
            start = Number(start);
            end = Number(end);

            assert.ok((!isNaN(start) || !isNaN(end)), "Query string parameters <start, limit> must be positive integers.");
            assert.ok(start >= 0, "Query string parameter <skip> must be a positive integer.");
            assert.ok(end > 0, "Query string parameter <limit> must be a non-zero positive integer.");

            let channels: any = await Channel.find(query).lean().exec();

            // Media filters
            filters = [];

            let channel: any = _.first(channels);

            (channel?._id) && filters.push({
                "match": {
                    "document.channel": channel?._id
                }
            });

            let mustNotFilters: any = [];

            // !otherOptions?.isMobile && (mustNotFilters.push({
            //     "match": {
            //         "document.type": FEED_MEDIA_TYPES.SNIP
            //     }
            // }));

            let medias = await this.elasticSearch({
                type: KOPPR_SEARCH_INDEX_PREFIX.MEDIA, mediaType: type, otherFilters: {
                    "must": filters,
                    "must_not": mustNotFilters
                }, skip: start, limit: end > 10000 ? 10000 : end,
                sort: [{
                    "document.pubDate": { "order": "desc" }
                }]
            });


            medias = descriptionConverter(medias);

            channel["medias"] = medias;

            return res.status(200).send({ success: true, msg: null, data: channel });
        } catch (err) {
            return res.status(400).send({ success: false, "msg": errorFormatterService(err) });
        }
    }

    async oldGetChannelInfo(req: any, res: any) {
        try {
            let channels: any;
            let blocked = req?.body?.blocked;

            let query: any = {};

            blocked && (query.blocked = convertStringToBoolean(blocked));

            assert.ok(req?.params?._id, "ID does not exist");
            assert.ok(validObjectIdRegex(req?.params?._id), "Invalid Object ID :" + req?.params?._id);

            let channelExists: any = await Channel.exists({ "_id": req.params._id });
            assert.ok(channelExists, "Channel could not be found with id :" + req.params._id);

            query._id = ObjectId(req?.params?._id);

            channels = await Channel.aggregate([
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

            return res.status(200).send({ success: true, msg: null, data: _.first(channels) });
        } catch (err) {
            return res.status(400).send({ success: false, "msg": errorFormatterService(err) });
        }
    }

    getAllInterest = async (req: any, res: any) => {
        try {
            let interests: any;

            let { start: skip, end: limit } = req.query;

            if (skip || limit) {
                // Pagination option validation
                skip = Number(skip);
                limit = Number(limit) || 1000000;

                assert.ok((!isNaN(skip) || !isNaN(limit)), "Query string parameters <start, limit> must be positive integers.");
                assert.ok(skip >= 0, "Query string parameter <skip> must be a positive integer.");
                assert.ok(skip > 0, "Query string parameter <limit> must be a non-zero positive integer.");
            }

            interests = await this.elasticSearch({ type: KOPPR_SEARCH_INDEX_PREFIX.INTEREST, skip: (skip || 0), limit: (limit || 10000) });

            interests = await Promise.all(interests.map(async (interest) => {
                let userPreferences = await UserPreference.count({ interests: { $in: interest?._id } }).lean().exec();
                interest['followersCount'] = userPreferences;
                let totalPosts = await Media.count({ interests: { $in: interest?._id }, blocked:false }).lean().exec();
                interest['totalPosts'] = totalPosts;
                return interest;
            }));

            return res.status(200).send({ success: true, msg: null, data: interests });
        } catch (err) {
            return res.status(400).send({ success: false, "msg": errorFormatterService(err) });
        }
    }

    async getAllInterestCMS(req: any, res: any) {
        try {
            let interests: any;
            let { start, end } = req.query;

            if (start || end) {

                // Pagination option validation
                start = Number(start);
                end = Number(end);

                assert.ok((!isNaN(start) || !isNaN(end)), "Query string parameters <start, limit> must be positive integers.");
                assert.ok(start >= 0, "Query string parameter <skip> must be a positive integer.");
                assert.ok(end > 0, "Query string parameter <limit> must be a non-zero positive integer.");

                interests = await Interest.find({}).skip(start).limit(end).lean().exec();
            }
            else {
                interests = await Interest.find({}).lean().exec();
            }

            interests = await Promise.all(interests.map(async (interest) => {
                let userPreferences = await UserPreference.count({ interests: { $in: interest?._id } }).lean().exec();
                interest['followersCount'] = userPreferences;
                return interest;
            }));

            return res.status(200).send({ success: true, msg: null, data: interests });
        } catch (err) {
            return res.status(400).send({ success: false, "msg": errorFormatterService(err) });
        }
    }

    async getInterestInfo(req: any, res: any) {
        let interest: any;
        try {
            let query: any = {};
            log("query",query)

            assert.ok(req?.params?.id, "No ID Found.")

            let isValidId = validObjectIdRegex(req?.params?.id);
            isValidId && (query._id = ObjectId(req?.params?.id));
            !isValidId && (query.permalinkName = req?.params?.id);

            // assert.ok(validObjectIdRegex(req?.params?.id), "Invalid Object ID " + req?.params?.id)
            let interestExists: any = await Interest.exists(query);
            assert.ok(interestExists, "Interest could not be found with id :" + req.params.id)

            !query.permalinkName && ( query._id = ObjectId(req?.params?.id))

            interest = await Interest.findOne(query).lean().exec();
            !interest?.permalinkName && (interest["permalinkName"] = null);
            !interest?.thumbnailUrl && (interest["thumbnailUrl"] = null);

            

            return res.status(200).send({ success: true, msg: null, data: interest });
        } catch (err) {
            return res.status(400).send({ success: false, "msg": errorFormatterService(err) });
        }
    }

    async deleteInterest(req: any, res: any) {
        let interest: any;
        let userPreference: any;

        try {
            let query: any = {};

            assert.ok(validObjectIdRegex(req?.params?._id), "Invalid Object ID " + req?.params?._id);

            let interestExists: any = await Interest.exists({ "_id": req.params.id });
            assert.ok(interestExists, "Interest could not be found with id :" + req.params.id)

            query._id = ObjectId(req?.params?.id);

            interest = await Interest.deleteOne(query).lean().exec();
            userPreference = await UserPreference.updateMany({ "interests": { "$exists": true } }, { $pull: { "interests": req?.params?.id } }, { upsert: false });

            return res.status(200).send({ success: true, msg: null, data: [] });
        } catch (err) {
            return res.status(400).send({ success: false, "msg": errorFormatterService(err) });
        }
    }

    async createInterest(req: any, res: any) {
        let interest: any;
        let payload: any = {}
        try {
            let { name, permalinkName, longDescription } = req.body;
            let isReqdParamsAvailable = Object.values(VALID_INTEREST_ATTRIBUTES).every((k) => { return k in req?.body });
            assert.ok(isReqdParamsAvailable, "Invalid parameters in request body. Please specify exactly these parameters: " + VALID_INTEREST_ATTRIBUTES.NAME);

            let isValidInterest = Object.values(VALID_INTERESTS).some(v => v === name);

            assert.ok(validPermalinkName(permalinkName), "permalinkName is not URL safe. You may only use alphanumerics, dashes, and underscores.");

            assert.ok(isValidInterest, "Parameter name must be a valid interest. Valid interest are " + VALID_INTERESTS.AUTOMOTIVE_FINANCE + " or " +
                VALID_INTERESTS.BANKING + " or " + VALID_INTERESTS.BONDS + " or " + VALID_INTERESTS.BUDGETING_SAVINGS + "or" +
                VALID_INTERESTS.COMMODITIES + " or " + VALID_INTERESTS.ECONOMY_GOVERNMENT + " or " + VALID_INTERESTS.ESTATE_PLANNING + "or" +
                VALID_INTERESTS.FAMILY_FINANCE + " or " + VALID_INTERESTS.FUNDING + " or " + VALID_INTERESTS.FUTURE_OPTIONS + "or" +
                VALID_INTERESTS.GOLD_INVESTMENTS + " or " + VALID_INTERESTS.HOME_OWNERSHIP + " or " + VALID_INTERESTS.INSURANCE + "or" +
                VALID_INTERESTS.INVESTMENT_PLANNING + " or " + VALID_INTERESTS.IPO + " or " + VALID_INTERESTS.LOANS + "or" +
                VALID_INTERESTS.MARKETS + " or " + VALID_INTERESTS.MISCELLANEOUS + " or " + VALID_INTERESTS.MUTUAL_FUNDS + "or" +
                VALID_INTERESTS.PERSONAL_FINANCE + " or " + VALID_INTERESTS.STOCK_MARKETS + " or " + VALID_INTERESTS.TAX_PLANNING + "or" + VALID_INTERESTS.VALUE_INVESTING + " or "
                + VALID_INTERESTS.WEALTH + " or " + VALID_INTERESTS.MISCELLANEOUS);

            payload = {
                "name": name,
                "permalinkName": permalinkName
            }
            longDescription && (payload.longDescription = longDescription)

            interest = new Interest(payload);
            interest = await interest.save();
            return res.status(200).send({ success: true, msg: null, data: interest });
        } catch (err) {
            return res.status(400).send({ success: false, msg: errorFormatterService(err) });

        }
    }

    async getFollowedInterest(req: any, res: any) {
        let followedInterest: any;
        try {
            let { userId } = req.query;

            assert.ok(userId, "No Object ID exist");

            assert.ok(validObjectIdRegex(userId), "Invalid Object ID " + userId)
            let isReqdParamsAvailable = Object.values(GET_USERS_FOLLOWED_INTERESTS_REQUIRED_PARAMS).every((k) => { return k in req?.query });

            assert.ok(isReqdParamsAvailable, "Invalid query string parameters. Please specify exactly these parameters: " + GET_USERS_FOLLOWED_INTERESTS_REQUIRED_PARAMS.USER_ID);

            followedInterest = await UserPreference.findOne({ "_id": req.query.userId }, { "interests": 1 }).lean().exec();
            return res.status(200).send({
                success: true, msg: null, data: (followedInterest?.interests || [])
            });

        } catch (err) {
            return res.status(400).send({ success: false, "msg": errorFormatterService(err) });
        }
    }

    getRecommendationChannels = async (req: any, res: any) => {
        try {

            let filters: any = [];
            let { country } = req.query;

            let isReqdParamsAvailable = Object.values(GET_RECOMMENDATION_CHANNELS_REQUIRED_PARAMS).every((k) => { return k in req?.query });

            assert.ok(isReqdParamsAvailable, `Invalid query string parameters. Please specify exactly these parameters: ${Object.values(GET_RECOMMENDATION_CHANNELS_REQUIRED_PARAMS).join(' or ')}`);

            country = country.toUpperCase();
            assert.ok(country.length === 2, "Parameter country must be a valid two-digit ISO country code.");

            let limit = 20;

            country && filters.push({
                "match": {
                    "document.country": country
                }
            })

            let channels: any = await this.elasticSearch({
                type: KOPPR_SEARCH_INDEX_PREFIX.CHANNEL,
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
                }
                , skip: 0, limit
            });

            return res.status(200).send({
                success: true, msg: null, data: channels || []
            });

        } catch (err) {
            return res.status(400).send({ success: false, "msg": errorFormatterService(err) });
        }
    }

    async followUnfollowChannels(req: any, res: any) {
        try {
            let { userId, action, channels } = req.body;
            let cond;
            let anotherCond;

            let isReqdParamsAvailable = Object.values(ACTIONS_FOLLOW_CHANNELS_REQUIRED_PARAMS).every((k) => { return k in req?.body });
            assert.ok(isReqdParamsAvailable, `Invalid query string parameters. Please specify exactly these parameters: ${Object.values(ACTIONS_FOLLOW_CHANNELS_REQUIRED_PARAMS).join(' or ')}`);

            let isValidAction = Object.values(VALID_CHANNEL_ACTIONS).some(v => v === action);

            assert.ok(isValidAction, `Parameter action must be one of ${Object.values(VALID_CHANNEL_ACTIONS).join(' or ')}`);

            let channelsType = typeof channels;

            assert.ok((channelsType === 'object'), "Parameter <channels> must be a list");

            assert.ok(!(_.isEmpty(channels)), "Internal server error while performing " + action +
                " channels " + channels + " for userId " + userId);


            // Validate all channel ids are valid
            let isIdValid = channels.every(function (value) {
                return (validObjectIdRegex(value))
            });
            assert.ok(isIdValid, "Channel Contains Invalid ID or Non exist.");

            let isChannelExist = await Channel.count({ _id: { "$in": channels } }).lean().exec();
            assert.ok((isChannelExist === channels.length), "No Channel with id could be found");

            (action === 'follow') ? (cond = { $addToSet: { "following": { "$each": channels } } }) : (cond = { $pull: { "following": { "$in": channels } } });

            let userPreference = await UserPreference.findOneAndUpdate({ _id: userId }, cond, { upsert: true, new: true }).lean().exec();

            action === "follow" ? anotherCond = { $push: { followers: userId } } : anotherCond = { $pull: { "followers": { "$in": userId } } };

            let finalAns = await Channel.updateMany({ _id: { $in: channels } }, anotherCond, { upsert: false, new: true }).lean().exec();

            return res.status(200).send({
                success: true, msg: null, data: userPreference
            });

        } catch (err) {
            log("Error in follow", err);
            return res.status(400).send({ success: false, "msg": errorFormatterService(err) });
        }
    }

    async userpreferenceInterests(req: any, res: any) {
        try {
            let { userId, action, interests } = req.body;

            let condition;

            let isReqdParamsAvailable = Object.values(POST_INTERESTS_REQUIRED_PARAMS).every((k) => { return k in req?.body });
            assert.ok(isReqdParamsAvailable, "Invalid parameters in request body. Please specify exactly these parameters: " + POST_INTERESTS_REQUIRED_PARAMS.ACTION +
                " or " + POST_INTERESTS_REQUIRED_PARAMS.INTERESTS + " or " + POST_INTERESTS_REQUIRED_PARAMS.USER_ID);

            let interestType = typeof interests;

            assert.ok((interestType === 'object'), "Parameter <interests> must be a list");


            let isValidAction = Object.values(VALID_CHANNEL_ACTIONS).some(v => v === action);

            assert.ok(isValidAction, "Parameter action must be one of " + VALID_CHANNEL_ACTIONS.FOLLOW + " or " +
                VALID_CHANNEL_ACTIONS.UNFOLLOW)

            let isIdValid = interests.every(function (value) {
                return (validObjectIdRegex(value));
            }
            );
            assert.ok(isIdValid, "Interest ID is not a valid ID.")

            let isinterestExist = await Interest.count({ _id: { "$in": interests } }).lean().exec();
            assert.ok((isinterestExist === interests.length), "No Interest with id could be found")


            action === "follow" ? condition = { $addToSet: { "interests": { "$each": interests } } } : condition = { $pull: { "interests": { "$in": interests } } };


            let userPreference = await UserPreference.findOneAndUpdate({ _id: userId }, condition, { upsert: true, new: true }).lean().exec();

            return res.status(200).send({
                success: true, msg: null, data: userPreference
            });
        } catch (err) {
            return res.status(400).send({ success: false, "msg": errorFormatterService(err) });
        }
    }

    followedChannels = async (req: any, res: any) => {
        let followedChannel: any
        try {
            let { userId } = req.query;
            let isReqdParamsAvailable = Object.values(GET_USERS_FOLLOWED_INTERESTS_REQUIRED_PARAMS).every((k) => { return k in req?.query });

            assert.ok(isReqdParamsAvailable, "Invalid query string parameters. Please specify exactly these parameters: " + GET_USERS_FOLLOWED_INTERESTS_REQUIRED_PARAMS.USER_ID);

            assert.ok(validObjectIdRegex(userId), "Invalid userId: " + userId);

            let userPreferenceExists: any = UserPreference.exists({ "_id": userId });
            assert.ok((userPreferenceExists), "[]");

            let following: any;
            followedChannel = await UserPreference.findOne({ "_id": userId }, { following: 1 }).lean().exec();

            (followedChannel?.following && followedChannel?.following?.length) ? (following = followedChannel.following) : (following = [])

            let channels = await Channel.find({ _id: { $in: following } }, { _id: 1, name: 1, thumbnailUrl: 1 }).lean().exec();
            // let channels = await this.elasticSearch({
            //     type: KOPPR_SEARCH_INDEX_PREFIX.CHANNEL,
            //     otherOptions: {
            //         "_source": {
            //             "includes": ["document._id", "document.name", "document.thumbnailUrl"]
            //         }
            //     },
            //     otherFilters: {
            //         "filter": {
            //             "terms": {
            //                 "document._id": following
            //             }
            //         }
            //     }
            // });

            channels = await Promise.all(channels.map(async (channel) => {
                let totalPosts = await Media.count({ channel: channel?._id, blocked:false}).lean().exec();
                channel['totalPosts'] = totalPosts;
                return channel;
            }));

            return res.status(200).send(channels);
        } catch (err) {
            return res.status(400).send({ success: false, "msg": errorFormatterService(err) });
        }
    }

    async getBookmarks(req: any, res: any) {
        try {
            let isReqdParamsAvailable = Object.values(GET_USERS_BOOKMARKS_REQUIRED_PARAMS).every((k) => { return k in req?.query });

            assert.ok(isReqdParamsAvailable, "Invalid query string parameters. Please specify exactly these parameters: " + GET_USERS_BOOKMARKS_REQUIRED_PARAMS.USER_ID);

            let userId = req.query.userId;

            assert.ok(validObjectIdRegex(userId), "Invalid userId: " + userId);

            let userPreference: any = await UserPreference.findOne({ "_id": userId }, { "bookmarks": 1 }).lean().exec();

            let bookmark = (userPreference?.bookmarks) ? userPreference.bookmarks : [];

            let medias: any = await Media.aggregate([
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

        } catch (err) {
            return res.status(400).send({ success: false, "msg": errorFormatterService(err) });
        }
    }

    async userPreferencesBookmarks(req: any, res: any) {
        try {

            let { action, userId, media } = req.body;

            let payload: any = {};

            let isReqdParamsAvailable = Object.values(POST_BOOKMARK_REQUIRED_PARAMS).every((k) => { return k in req?.body });

            assert.ok(isReqdParamsAvailable, "Invalid parameters in request body. Please specify exactly these parameters: " + POST_BOOKMARK_REQUIRED_PARAMS.ACTION +
                " or " + POST_BOOKMARK_REQUIRED_PARAMS.MEDIA + " or " + POST_BOOKMARK_REQUIRED_PARAMS.USER_ID);

            assert.ok(validObjectIdRegex(media), "Invalid media" + media);
            let isValidAction = Object.values(VALID_BOOKMARK_ACTION).some(v => v === action);

            assert.ok(isValidAction, "Parameter action must be one of " + VALID_BOOKMARK_ACTION.ADD + " or " +
                VALID_BOOKMARK_ACTION.REMOVE);

            let mediaExists: any = await Media.exists({ "_id": media });

            assert.ok((mediaExists), "media " + media + " does not exist.");

            payload = action === 'add' ? { "$addToSet": { "bookmarks": media } } : { "$pull": { "bookmarks": media } };

            let userPreference = await UserPreference.findOneAndUpdate(
                { "_id": userId },
                payload,
                { upsert: true, new: true }
            )

            return res.status(200).send({ success: true, msg: null, data: userPreference });

        } catch (err) {
            return res.status(400).send({ success: false, msg: errorFormatterService(err) });
        }
    }

    getMediaByIdForFeedsCms = async (req: any, res: any) => {
        try {
            let _id = req?.params?._id;
            assert.ok(_id, _id + " does not exist.");


            assert.ok(validObjectIdRegex(req?.params?._id), "media " + _id + " does not exist.");

            let mediaExists: any = await Media.exists({ "_id": _id });
            assert.ok((mediaExists), "media " + _id + " does not exist.");

            let media = ObjectId(req.params._id);

            let medias = await Media.aggregate([
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
                    "$project": {
                        ...MediaFieldset
                    }
                },
                {
                    "$limit": 1
                }
            ]);

            media = _.first(medias);

            media = descriptionConverter(media);

            return res.status(200).send({ success: true, msg: null, data: media });
        } catch (err) {
            return res.status(400).send({ success: false, msg: errorFormatterService(err) });
        }
    }

    getMediaByIdForFeeds = async (req: any, res: any) => {
        try {
            let { _id } = req.params;
            let filters: any = [];

            assert.ok(_id, _id + " does not exist.");
            assert.ok(validObjectIdRegex(_id), "media " + _id + " does not exist.");

            let mediaExists: any = await Media.exists({ "_id": _id });
            assert.ok((mediaExists), "media " + _id + " does not exist.");

            _id && filters.push({
                "match": {
                    "document._id": _id
                }
            });

            let medias = await this.elasticSearch({
                type: KOPPR_SEARCH_INDEX_PREFIX.MEDIA, otherFilters: {
                    "must": filters
                }, limit: 1
            });
            let media: any 
            if(medias?.length) {
                media = _.first(medias);
            }
            else {
                // if data not found in elastic search , find in mongoDb
                media = await Media.findOne({_id})
                        .populate('channel').lean().exec();
                media = {
                    ...media,
                    channelThumbnailUrl: media?.channel?.thumbnailUrl,
                    channelName: media?.channel?.name,
                    channelCountry: media?.channel?.country,
                    channelPermalinkName: media?.channel?.permalinkName,
                    channelBlocked: media?.channel?.blocked,
                 }
                 media.channel = media?.channel?._id
            }
            descriptionConverter(media);

            return res.status(200).send({ success: true, msg: null, data: media });
        } catch (err) {
            return res.status(400).send({ success: false, msg: errorFormatterService(err) });
        }
    }


    async updateReaction(req: any, res: any) {
        try {
            let condition: any;
            let anotherCond: any;

            let isReqdParamsAvailable = Object.values(REACTION_REQUIRED_PARAMS).every((k) => { return k in req?.body });

            assert.ok(isReqdParamsAvailable, "Invalid parameters in request body. Please specify exactly these parameters: " +
                REACTION_REQUIRED_PARAMS.USER_ID + " or " + REACTION_REQUIRED_PARAMS.MEDIA + " or " + REACTION_REQUIRED_PARAMS.ACTION);

            let { userId, media, reaction } = req.body;

            assert.ok(validObjectIdRegex(media), "Invalid " + media + " media .")

            let mediaExists: any = await Media.exists({ "_id": media });
            assert.ok((mediaExists), "media " + media + " does not exist.");

            let isValidReaction = Object.values(VALID_REACTIONS).some(v => v === reaction);
            assert.ok(isValidReaction, "Parameter reaction must be one of " + VALID_REACTIONS.ANGRY + " or " +
                VALID_REACTIONS.HOT + " or " + VALID_REACTIONS.LOVE + " or " + VALID_REACTIONS.SAD + " or " + VALID_REACTIONS.SMILE);

            let react = Object.values(VALID_REACTIONS).some(v => v === reaction);

            (react) &&
                (condition = { "$addToSet": { [reaction]: media } }, anotherCond = { "$addToSet": { [reaction]: userId } });

            Object.values(VALID_REACTIONS).forEach(async function (element) {
                console.log("element---->>", element);
                let pulluserPreferenceReactions = await UserPreference.findOneAndUpdate({ _id: userId }, { "$pull": { [element]: media } }, { upsert: true, new: true });
                let pullmediaReactions = await Media.findOneAndUpdate({ _id: media }, { "$pull": { [element]: userId } }, { upsert: false, new: true });
            })

            let userPreferenceReactions = await UserPreference.findOneAndUpdate({ _id: userId }, condition, { upsert: true, new: true });
            let mediaReactions = await Media.findOneAndUpdate({ _id: media }, anotherCond, { upsert: false, new: true });

            let updatedData = await Media.findOne(
                { "_id": media },
                { "cleanedRawContent": 0, "tags": 0 });

            return res.status(200).send({ success: true, msg: null, data: updatedData });
        } catch (err) {
            return res.status(400).send({ success: false, msg: errorFormatterService(err) });
        }
    }

    async editMedia(req: any, res: any) {
        try {
            let { blocked, hashtags, permalinkName, longDescription } = req?.body;
            let _id = req?.params?._id;

            assert.ok(_id, `Media id ${_id} does not exist.`);

            assert.ok(validObjectIdRegex(_id), `Invalid Object ID ${_id})`);

            assert.ok(validPermalinkName(permalinkName), "permalinkName is not URL safe. You may only use alphanumerics, dashes, and underscores.");

            // Check if media exists
            let mediaExists: any = await Media.exists({});
            assert.ok(mediaExists, `Media id ${_id} does not exist.`);

            // Check that only valid attrs are being updated
            let isValidAttributes = Object.keys(req?.body).every((k) => { return k in VALID_MEDIA_ATTRIBUTES });
            assert.ok(isValidAttributes, `Invalid parameters in request body. Only the following attributes are valid: ${Object.values(VALID_MEDIA_ATTRIBUTES).join(' or ')}`);

            // Check that the "blocked" attr is a boolean
            assert.ok(typeof blocked === "boolean", `Attribute 'blocked' must be a boolean.`);

            // Check that the "hashtags" attr is a list and only contains valid hashtags
            if (hashtags) {
                assert.ok(_.isArray(hashtags), `Attribute 'hashtags' must be a list.`);
            }
            let media = await Media.findOneAndUpdate({ _id: ObjectId(_id) }, { $set: req?.body }, { new: true }).lean().exec();

            return res.status(200).send({ success: true, msg: null, data: media });

        } catch (err) {
            return res.status(400).send({ success: false, msg: errorFormatterService(err) });
        }
    }

    getMediaByInterest = async (req: any, res: any) => {

        try {
            let { otherOptions, start, end } = req.query;
            otherOptions = JSON.parse(otherOptions);

            let isValidAttributes = Object.values(GET_ALL_MEDIA_REQUIRED_ARGS).every((k) => { return k in req?.query });
            assert.ok(isValidAttributes, `Invalid query string parameters.Please specify exactly these parameters: ${Object.values(GET_ALL_MEDIA_REQUIRED_ARGS).join(' or ')}`);

            let { interest, country, type } = req.query;

            // Media type validation
            if (type) {
                let validMediaType = Object.values(VALID_MEDIA_TYPES_FOR_INTEREST)?.some(v => v === type);
                assert.ok(validMediaType, `Query string parameter <mediaType> must be one of ${Object.values(VALID_MEDIA_TYPES_FOR_INTEREST).join(' or ')}`);
            }

            // Check that the country code is valid
            assert.ok((country?.length === 2), `Parameter <country> must be a valid two-digit ISO country code.`);
            assert.ok(interest, `Interest id ${interest} does not exist.`);

            let query: any = {};
            let filters: any = [];

            let isValidId = validObjectIdRegex(interest);

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

            let interests: any = await this.elasticSearch({
                type: KOPPR_SEARCH_INDEX_PREFIX.INTEREST, otherFilters: {
                    "must": filters
                }, limit: 1
            });

            let interestInfo: any = _.first(interests);

            assert.ok(interestInfo, `Interest id ${interest} does not exist.`);

            start = Number(start);
            end = Number(end);

            assert.ok((!isNaN(start) || !isNaN(end)), "Query string parameters <start, limit> must be positive integers.");
            assert.ok(start >= 0, "Query string parameter <skip> must be a positive integer.");
            assert.ok(end > 0, "Query string parameter <limit> must be a non-zero positive integer.");

            filters = [];

            let mustFilters: any = [
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

            let mustNotFilters: any = [
                {
                    "match": {
                        "document.channelBlocked": true
                    }
                }
                ,
                {
                    "match": {
                        "document.blocked": true
                    }
                }
            ];
            // enable snips on web
            // !otherOptions?.isMobile && (mustNotFilters.push({
            //     "match": {
            //         "document.type": FEED_MEDIA_TYPES.SNIP
            //     }
            // }));

            let totalMedias = await this.elasticSearch({
                type: KOPPR_SEARCH_INDEX_PREFIX.MEDIA, query, country, mediaType: type,
                otherFilters: {
                    "must": mustFilters,
                    "must_not": mustNotFilters
                }
            });

            totalMedias = totalMedias?.length || 0;



            let esQuery: any = {
                type: KOPPR_SEARCH_INDEX_PREFIX.MEDIA, query, country, mediaType: type, skip: start, limit: end,
                otherFilters: {
                    "must": mustFilters,
                    "must_not": mustNotFilters
                }
            };

            type !== 'all' && (esQuery['sort'] = [{
                "document.pubDate": { "order": "desc" }
            }]);

            let medias: any = await this.elasticSearch(esQuery);

            medias = descriptionConverter(medias);

            return res.status(200).send({ success: true, msg: null, data: medias, totalCount: totalMedias, interestInfo: interestInfo });

        } catch (err) {
            log("Error in getMediaByInterest(): ", err);
            return res.status(400).send({ success: false, msg: errorFormatterService(err) });
        }
    }

    getMedia = async (req: any, res: any) => {
        try {
            let { start, end } = req.body;
            let isValidAttributes = Object.values(GET_MEDIA_REQUIRED_ARGS).every((k) => { return k in req?.body });
            assert.ok(isValidAttributes, `Invalid query string parameters.Please specify exactly these parameters: ${Object.values(GET_MEDIA_REQUIRED_ARGS).join(' or ')}`);

            // Pagination
            start = Number(start);
            end = Number(end);

            assert.ok((!isNaN(start) || !isNaN(end)), "Query string parameters <start, limit> must be positive integers.");
            assert.ok(start >= 0, "Query string parameter <skip> must be a positive integer.");
            assert.ok(end > 0, "Query string parameter <limit> must be a non-zero positive integer.");

            let medias = await Media.find({}).skip(start).limit(end).sort({ "_id": -1 }).lean().exec();

            medias = descriptionConverter(medias);

            return res.status(200).send({ success: true, msg: null, data: (medias || []) });
        } catch (err) {
            return res.status(400).send({ success: false, msg: errorFormatterService(err) });
        }
    }

    getRecommendationsNew = async (req: any, res: any) => {
        try {
            let medias: any;

            let { otherOptions, userId, mediaType, country, start, end } = req.query;

            otherOptions = JSON.parse(otherOptions);

            let userTags: any = [];
            let isValidAttributes = Object.values(GET_RECOMMENDATION_MEDIA_REQUIRED_ARGS).every((k) => { return k in req?.query });
            assert.ok(isValidAttributes, `Invalid query string parameters.Please specify exactly these parameters: ${Object.values(GET_RECOMMENDATION_MEDIA_REQUIRED_ARGS).join(' or ')}`);

            // Media type validation
            let validMediaType = Object.values(VALID_MEDIA_TYPES)?.some(v => v === mediaType);
            assert.ok(validMediaType, `Query string parameter <mediaType> must be one of ${Object.values(VALID_MEDIA_TYPES).join(' or ')}`);

            // Country validation
            let validCountry = (validISOCode(country));
            assert.ok(validCountry, `Parameter <country> must be a valid two-digit ISO country code.`);

            country !== 'all' && (country = country?.toUpperCase());

            // Pagination option validation
            start = Number(start);
            end = Number(end);

            assert.ok((!isNaN(start) || !isNaN(end)), "Query string parameters <start, end> must be integers.");
            assert.ok(start < end, "Query string parameter <start> must be less than <end>.");
            assert.ok(start >= 0, "start variable should be a positive integer");
            assert.ok(end > 0, "end variable should be a positive integer");

            let isValidUserId = (!userId.includes('-') && validObjectIdRegex(userId));
            userId = isValidUserId ? userId : GUEST_USER;

            let userPreferences: any;

            if (userId !== GUEST_USER) {
                // Get user's followed hashtags and channels
                userPreferences = await UserPreference.findOne({ "_id": userId }, { following: true, interests: true }).lean().exec();
            }

            userTags = userPreferences?.interests || [];
            let userFollowedChs = userPreferences?.following || [];

            // Get recommendations
            try {
                req.userId = userId;
                medias = await this.createRecsDataFrameNew(mediaType, country, userTags, userFollowedChs, otherOptions);
            } catch (err) {
                err = `Error in getRecommendationsNew(): ${err}`
                assert.fail(err);
            }

            // Limit for user
            medias = medias?.slice(start, end);
            medias = descriptionConverter(medias);

            return res.status(200).send(medias);
        } catch (err) {
            log("Error in getRecommendationsNew(): ", err);
            return res.status(400).send({ success: false, msg: errorFormatterService(err) });
        }
    }


    /**
     * @description Returns Recent Media List
     */
    getRecentMedia = async (req: any, res: any) => {
        try {
            let query: any = {};

            let { mediaType, country, skip, limit, otherOptions } = req?.query;

            otherOptions = JSON.parse(otherOptions);

            let isValidAttributes = Object.values(GET_RECENT_MEDIAS).every((k: any) => { return k in req?.query });
            assert.ok(isValidAttributes, `Invalid query string parameters.Please specify exactly these parameters: ${Object.values(GET_RECENT_MEDIAS).join(' or ')}`);

            // Pagination
            skip = Number(skip);
            limit = Number(limit);

            // Ensure that skip and limit are valid
            assert.ok((!isNaN(skip) || !isNaN(limit)), "Query string parameters <skip, limit> must be positive integers.");
            assert.ok(skip >= 0, "Query string parameter <skip> must be a positive integer.");
            assert.ok(limit > 0, "Query string parameter <limit> must be a non-zero positive integer.");

            // Check that the country code is valid
            assert.ok((country?.length === 2), `Parameter <country> must be a valid two-digit ISO country code.`);

            // Ensure that mediaType is valid
            let validMediaType = Object.values(VALID_MEDIA_TYPES)?.some(v => v === mediaType);
            assert.ok(validMediaType, `Query string parameter <mediaType> must be one of ${Object.values(VALID_MEDIA_TYPES).join(' or ')}`);

            country !== 'all' && (country = country?.toUpperCase());

            let mustNotFilters: any = [
                {
                    "match": {
                        "document.channelBlocked": true
                    }
                }
                ,
                {
                    "match": {
                        "document.blocked": true
                    }
                }

            ];

            // !otherOptions?.isMobile && (mustNotFilters.push({
            //     "match": {
            //         "document.type": FEED_MEDIA_TYPES.SNIP
            //     }
            // }));

            let medias: any = [];

            medias = await this.elasticSearch({
                type: KOPPR_SEARCH_INDEX_PREFIX.MEDIA, query, country, mediaType, skip, limit,
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

            medias = descriptionConverter(medias);

            return res.status(200).send(medias);
        } catch (error) {
            log("Error in getRecentMedia(): ", error);
            return res.status(400).send({ success: false, msg: errorFormatterService(error) });
        }
    }

    /**
     * @description Returns Recent Media List (With multiple media types)
     */
    getRecentMediaNew = async (req: any, res: any) => {
        try {
            let query: any = {};
            let { mediaType, country, skip, limit } = req?.body;

            let isValidAttributes = Object.values(GET_RECENT_MEDIAS).every((k: any) => { return k in req?.body });
            assert.ok(isValidAttributes, `Invalid query string parameters.Please specify exactly these parameters: ${Object.values(GET_RECENT_MEDIAS).join(' or ')}`);

            // Pagination
            skip = Number(skip);
            limit = Number(limit);

            // Ensure that skip and limit are valid
            assert.ok((!isNaN(skip) || !isNaN(limit)), "Query string parameters <skip, limit> must be positive integers.");
            assert.ok(skip >= 0, "Query string parameter <skip> must be a positive integer.");
            assert.ok(limit > 0, "Query string parameter <limit> must be a non-zero positive integer.");

            // Check that the country code is valid
            assert.ok((country?.length === 2), `Parameter <country> must be a valid two-digit ISO country code.`);

            // Ensure that mediaType is valid
            mediaType.map((mt) => {
                let validMediaType = Object.values(VALID_MEDIA_TYPES)?.some(v => v === mt);
                assert.ok(validMediaType, `Query string parameter <mediaType> must be one of ${Object.values(VALID_MEDIA_TYPES).join(' or ')}`);
            });

            country !== 'all' && (country = country?.toUpperCase());

            let mustNotFilters: any = [
                {
                    "match": {
                        "document.channelBlocked": true
                    }
                }
                ,
                {
                    "match": {
                        "document.blocked": true
                    }
                }

            ];

            // !otherOptions?.isMobile && (mustNotFilters.push({
            //     "match": {
            //         "document.type": FEED_MEDIA_TYPES.SNIP
            //     }
            // }));

            let medias: any = [];

            for (const mt of mediaType) {
                let moreLimit = [FEED_MEDIA_TYPES.PODCAST, FEED_MEDIA_TYPES.SNIP].some((t: any) => t === mt);

                limit = moreLimit ? 20 : limit;

                let recs = await this.elasticSearch({
                    type: KOPPR_SEARCH_INDEX_PREFIX.MEDIA, query, mediaType: mt, country, skip, limit,
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

            medias = descriptionConverter(medias);

            return res.status(200).send(medias);
        } catch (error) {
            log("Error in  getRecentMediaNew(): ", error);
            return res.status(400).send({ success: false, msg: errorFormatterService(error) });
        }
    }

    /**
     * @description Returns Recent Media By Channel
     */
    getRecentMediaByChannel = async (req: any, res: any) => {
        try {
            let filters: any = [];

            let { mediaType, country, skip, limit, channel, channelPermalinkName, query: searchTerm, otherOptions } = req?.query;

            otherOptions = JSON.parse(otherOptions);

            let isValidAttributes = Object.values(GET_RECENT_MEDIAS_BY_CHANNEL).every((k) => { return k in req?.query });
            assert.ok(isValidAttributes, `Invalid query string parameters.Please specify exactly these parameters: ${Object.values(GET_RECENT_MEDIAS_BY_CHANNEL).join(' or ')}`);

            assert.ok((channel || channelPermalinkName), `Please specify exactly these parameters: channel or channelPermalinkName`);

            // Pagination
            skip = Number(skip);
            limit = Number(limit);

            // Ensure that skip and limit are valid
            assert.ok((!isNaN(skip) || !isNaN(limit)), "Query string parameters <skip, limit> must be positive integers.");
            assert.ok(skip >= 0, "Query string parameter <skip> must be a positive integer.");
            assert.ok(limit > 0, "Query string parameter <limit> must be a non-zero positive integer.");

            // Check that the country code is valid
            assert.ok((country?.length === 2), `Parameter <country> must be a valid two-digit ISO country code.`);

            // Ensure that mediaType is valid
            let validMediaType = Object.values(VALID_MEDIA_TYPES)?.some(v => v === mediaType);
            assert.ok(validMediaType, `Query string parameter <mediaType> must be one of ${Object.values(VALID_MEDIA_TYPES).join(' or ')}`);

            country !== 'all' && (country = country?.toUpperCase());

            validObjectIdRegex(channel) ? filters.push({
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

            let mustNotFilters: any = [
                {
                    "match": {
                        "document.channelBlocked": true
                    }
                }
                ,
                {
                    "match": {
                        "document.blocked": true
                    }
                }
            ];

            // !otherOptions?.isMobile && (mustNotFilters.push({
            //     "match": {
            //         "document.type": FEED_MEDIA_TYPES.SNIP
            //     }
            // }));

            let medias: any = await this.elasticSearch({
                type: KOPPR_SEARCH_INDEX_PREFIX.MEDIA, query: searchTerm, country, mediaType, skip, limit,
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

            medias = descriptionConverter(medias);

            return res.status(200).send(medias);
        } catch (error) {
            log("Error in getRecentMediaByChannel(): ", error);
            return res.status(400).send({ success: false, msg: errorFormatterService(error) });
        }
    }

    /**
     * @description Returns Recent Media By Interests
     */
    getRecentMediaByInterest = async (req: any, res: any) => {
        try {
            let filters: any = [];
            let query: any = {};

            let { mediaType, country, skip, limit, interests, interestPermalinkName, query: searchTerm, otherOptions } = req?.query;

            otherOptions = JSON.parse(otherOptions);

            let isValidAttributes = Object.values(GET_RECENT_MEDIAS_BY_INTEREST).every((k) => { return k in req?.query });
            assert.ok(isValidAttributes, `Invalid query string parameters.Please specify exactly these parameters: ${Object.values(GET_RECENT_MEDIAS_BY_INTEREST).join(' or ')}`);

            assert.ok((interests?.length > 0 || interestPermalinkName), `Please specify exactly these parameters: interests or interestPermalinkName`);

            // Pagination
            skip = Number(skip);
            limit = Number(limit);

            // Ensure that skip and limit are valid
            assert.ok((!isNaN(skip) || !isNaN(limit)), "Query string parameters <skip, limit> must be positive integers.");
            assert.ok(skip >= 0, "Query string parameter <skip> must be a positive integer.");
            assert.ok(limit > 0, "Query string parameter <limit> must be a non-zero positive integer.");

            // Check that the country code is valid
            assert.ok((country?.length === 2), `Parameter <country> must be a valid two-digit ISO country code.`);

            // Ensure that mediaType is valid
            let validMediaType = Object.values(VALID_MEDIA_TYPES)?.some(v => v === mediaType);
            assert.ok(validMediaType, `Query string parameter <mediaType> must be one of ${Object.values(VALID_MEDIA_TYPES).join(' or ')}`);

            country !== 'all' && (country = country?.toUpperCase());

            query = {
                // "pubDate": { "$gte": subHours(new Date(), 72) },
                "type": mediaType == "all" ? { "$exists": true } : { "$eq": mediaType },
                "blocked": { "$ne": true },
                "channel.blocked": { "$ne": true },
                "channel.country": country.toLowerCase() == "all" ? { "$exists": true } : { "$eq": country }
            };

            // !otherOptions?.isMobile && (query.type["$ne"] = FEED_MEDIA_TYPES.SNIP);

            validObjectIdRegex(interests) ? filters.push({
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

            let mustNotFilters: any = [
                {
                    "match": {
                        "document.channelBlocked": true
                    }
                }
                ,
                {
                    "match": {
                        "document.blocked": true
                    }
                }
            ];

            // !otherOptions?.isMobile && (mustNotFilters.push({
            //     "match": {
            //         "document.type": FEED_MEDIA_TYPES.SNIP
            //     }
            // }));

            let medias: any = await this.elasticSearch({
                type: KOPPR_SEARCH_INDEX_PREFIX.MEDIA, query: searchTerm, country, mediaType, skip, limit,
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

            medias = descriptionConverter(medias);

            return res.status(200).send(medias);
        } catch (error) {
            log("Error in getRecentMediaByInterest(): ", error);
            return res.status(400).send({ success: false, msg: errorFormatterService(error) });
        }
    }

    /**
     * @description Returns Trending Media List
     */
    getTrendingMedia = async (req: any, res: any) => {
        try {
            let query: any = {};
            let { mediaType, country, skip, limit, query: searchTerm, otherOptions } = req?.query;

            otherOptions = JSON.parse(otherOptions);

            let isValidAttributes = Object.values(GET_TRENDING_MEDIAS).every((k) => { return k in req?.query });
            assert.ok(isValidAttributes, `Invalid query string parameters.Please specify exactly these parameters: ${Object.values(GET_TRENDING_MEDIAS).join(' or ')}`);

            // Pagination
            skip = Number(skip);
            limit = Number(limit);

            // Ensure that skip and limit are valid
            assert.ok((!isNaN(skip) || !isNaN(limit)), "Query string parameters <skip, limit> must be positive integers.");
            assert.ok(skip >= 0, "Query string parameter <skip> must be a positive integer.");
            assert.ok(limit > 0, "Query string parameter <limit> must be a non-zero positive integer.");

            // Check that the country code is valid
            assert.ok((country?.length === 2), `Parameter <country> must be a valid two-digit ISO country code.`);

            // Ensure that mediaType is valid
            let validMediaType = Object.values(VALID_MEDIA_TYPES)?.some(v => v === mediaType);
            assert.ok(validMediaType, `Query string parameter <mediaType> must be one of ${Object.values(VALID_MEDIA_TYPES).join(' or ')}`);

            country !== 'all' && (country = country?.toUpperCase());

            query = {
                "type": mediaType == "all" ? { "$exists": true } : { "$eq": mediaType },
                "blocked": { "$ne": true },
                "channel.blocked": { "$ne": true },
                "channelCountry": country.toLowerCase() == "all" ? { "$exists": true } : { "$eq": country }
            };

            // !otherOptions?.isMobile && (query.type["$ne"] = FEED_MEDIA_TYPES.SNIP);

            let medias = await Media.aggregate(this.getTrendingMediaAggregateQuery({ skip, limit, query, searchTerm })).allowDiskUse(true).exec();

            medias = descriptionConverter(medias);

            return res.status(200).send(medias);
        } catch (error) {
            log("Error in getTrendingMedia(): ", error);
            return res.status(400).send({ success: false, msg: errorFormatterService(error) });
        }
    }

    /**
     * @description Returns Trending Media By Channel
     */
    getTrendingMediaByChannel = async (req: any, res: any) => {
        try {
            let query: any = {};
            let { mediaType, country, skip, limit, channel, channelPermalinkName, query: searchTerm, otherOptions } = req?.query;

            otherOptions = JSON.parse(otherOptions);

            let isValidAttributes = Object.values(GET_TRENDING_MEDIAS_BY_CHANNEL).every((k) => { return k in req?.query });
            assert.ok(isValidAttributes, `Invalid query string parameters.Please specify exactly these parameters: ${Object.values(GET_TRENDING_MEDIAS_BY_CHANNEL).join(' or ')}`);

            assert.ok((channel || channelPermalinkName), `Please specify exactly these parameters: channel or channelPermalinkName`);

            // Pagination
            skip = Number(skip);
            limit = Number(limit);

            // Ensure that skip and limit are valid
            assert.ok((!isNaN(skip) || !isNaN(limit)), "Query string parameters <skip, limit> must be positive integers.");
            assert.ok(skip >= 0, "Query string parameter <skip> must be a positive integer.");
            assert.ok(limit > 0, "Query string parameter <limit> must be a non-zero positive integer.");

            // Check that the country code is valid
            assert.ok((country?.length === 2), `Parameter <country> must be a valid two-digit ISO country code.`);

            // Ensure that mediaType is valid
            let validMediaType = Object.values(VALID_MEDIA_TYPES)?.some(v => v === mediaType);
            assert.ok(validMediaType, `Query string parameter <mediaType> must be one of ${Object.values(VALID_MEDIA_TYPES).join(' or ')}`);

            country !== 'all' && (country = country?.toUpperCase());

            query = {
                "type": mediaType == "all" ? { "$exists": true } : { "$eq": mediaType },
                "blocked": { "$ne": true },
                "channel.blocked": { "$ne": true },
                "channelCountry": country.toLowerCase() == "all" ? { "$exists": true } : { "$eq": country }
            };

            // !otherOptions?.isMobile && (query.type["$ne"] = FEED_MEDIA_TYPES.SNIP);

            validObjectIdRegex(channel) ? (query["channel"] = new ObjectId(channel)) : (query["channelPermalinkName"] = channel);
            channelPermalinkName && (query["channelPermalinkName"] = channelPermalinkName);

            let medias = await Media.aggregate(this.getTrendingMediaAggregateQuery({ skip, limit, query, searchTerm })).allowDiskUse(true).exec();

            medias = descriptionConverter(medias);

            return res.status(200).send(medias);
        } catch (error) {
            log("Error in getTrendingMediaByChannel(): ", error);
            return res.status(400).send({ success: false, msg: errorFormatterService(error) });
        }
    }

    /**
     * @description Returns Recent Media By Interests
     */
    getTrendingMediaByInterest = async (req: any, res: any) => {
        try {
            let query: any = {};

            let { mediaType, country, skip, limit, interests, interestPermalinkName, query: searchTerm, otherOptions } = req?.query;

            otherOptions = JSON.parse(otherOptions);

            let isValidAttributes = Object.values(GET_TRENDING_MEDIAS_BY_INTEREST).every((k) => { return k in req?.query });
            assert.ok(isValidAttributes, `Invalid query string parameters.Please specify exactly these parameters: ${Object.values(GET_TRENDING_MEDIAS_BY_INTEREST).join(' or ')}`);

            assert.ok((interests?.length > 0 || interestPermalinkName), `Please specify exactly these parameters: interests or interestPermalinkName`);

            // Pagination
            skip = Number(skip);
            limit = Number(limit);

            // Ensure that skip and limit are valid
            assert.ok((!isNaN(skip) || !isNaN(limit)), "Query string parameters <skip, limit> must be positive integers.");
            assert.ok(skip >= 0, "Query string parameter <skip> must be a positive integer.");
            assert.ok(limit > 0, "Query string parameter <limit> must be a non-zero positive integer.");

            // Check that the country code is valid
            assert.ok((country?.length === 2), `Parameter <country> must be a valid two-digit ISO country code.`);

            // Ensure that mediaType is valid
            let validMediaType = Object.values(VALID_MEDIA_TYPES)?.some(v => v === mediaType);
            assert.ok(validMediaType, `Query string parameter <mediaType> must be one of ${Object.values(VALID_MEDIA_TYPES).join(' or ')}`);

            country !== 'all' && (country = country?.toUpperCase());

            query = {
                "type": mediaType == "all" ? { "$exists": true } : { "$eq": mediaType },
                "blocked": { "$ne": true },
                "channel.blocked": { "$ne": true },
                "channelCountry": country.toLowerCase() == "all" ? { "$exists": true } : { "$eq": country }
            };

            // !otherOptions?.isMobile && (query.type["$ne"] = FEED_MEDIA_TYPES.SNIP);

            validObjectIdRegex(interests) ? (query["interests._id"] = new ObjectId(interests)) : (query["interests.permalinkName"] = interests);
            interestPermalinkName && (query["interests.permalinkName"] = interestPermalinkName);

            let medias = await Media.aggregate(this.getTrendingMediaAggregateQuery({ skip, limit, query, searchTerm })).allowDiskUse(true).exec();

            medias = descriptionConverter(medias);

            return res.status(200).send(medias);
        } catch (error) {
            log("Error in getTrendingMediaByInterest(): ", error);
            return res.status(400).send({ success: false, msg: errorFormatterService(error) });
        }
    }

    /**
     * @description Trending Media Aggregation Query
     */
    getTrendingMediaAggregateQuery = ({ skip = 0, limit = 20, query, searchTerm }) => {
        let aggregation: any = [];
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
                "$project": { ...MediaFieldset, totalReactions: 1 }
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
            }
            ,
            {
                "$skip": skip
            },

            {
                "$limit": limit
            }
        ];
    }

    createRecsDataFrameNew = async (mediaType, country, userInterests, userFollowedChs, otherOptions) => {

        let recentMedias: any = [];

        mediaType = mediaType === 'youtube' ? 'video' : mediaType;

        // Frame 1 - Recent Medias
        if (mediaType === 'all') {
            let mediaTypes = ['video', 'blog', 'podcast','snip'];
            // otherOptions?.isMobile && (mediaTypes.push('snip'));
            otherOptions.isAllMediaType = true;

            for (const iterMediaType of Object.values(mediaTypes)) {
                let isLessPreference = [FEED_MEDIA_TYPES.PODCAST, FEED_MEDIA_TYPES.SNIP].some((t: any) => t === iterMediaType);
                let limit = isLessPreference ? 50 : 100;
                let recs = await this.newestMediaAggES(iterMediaType, country, limit, otherOptions);
                recentMedias = [...recentMedias, ...recs];
            }
        } else {
            recentMedias = await this.newestMediaAggES(mediaType, country, 100, otherOptions);
        }


        // Frame 2 - Interested (Hashtags) Medias
        let interestedMedias: any = []

        interestedMedias = await this.getHashtagMatchedMediaES(mediaType, userInterests, country, 100, otherOptions);


        // Frame 3 - Followed Channels Medias

        let followedChMedias: any = [];

        followedChMedias = await this.mediaFromFollowedChannelsAggES(mediaType, userFollowedChs, country, 100, otherOptions);

        // Frame 4 - Recent Medias Koppr Sources

        let kopprSourceMedias: any = [];

        kopprSourceMedias = await this.mediaFromKopprSourcesAggES(mediaType, country, 100, otherOptions);


        // Create data frame 
        let resultMedias: any = [];

        if (followedChMedias?.length <= 0 && interestedMedias?.length <= 0 && recentMedias?.length <= 0 && kopprSourceMedias?.length <= 0) {
            log(`[IMPORTANT] No or Empty medias! Something is not right`);
            return resultMedias;
        }

        log(`Generating Data frames...`);

        /* TODO: UNSAFE LOGIC - start */

        let dfMedia1: any = [];

        let uniqueChannels = _.uniqBy(recentMedias, (v: any) => v.channelName).map((m: any) => m?.channelName);

        // Fetching recent 10 medias from each channel to avoid squishing records
        uniqueChannels.map(uc => {
            let medias = this.sortByDate(recentMedias.filter(rc => rc.channelName === uc)).slice(0, 10) || [];

            dfMedia1 = [...dfMedia1, ...medias];
        });

        dfMedia1 = _.shuffle(dfMedia1);
        /* TODO: UNSAFE LOGIC - end */

        log("DF MEDIA 1", dfMedia1);

        // Shuffle hash tagged media
        let dfMedia2 = _.shuffle(interestedMedias);

        // Shuffle followed channels media
        let dfMedia3 = _.shuffle(followedChMedias);

        // Shuffle and pick koppr source medias
        let dfMedia4 = _.shuffle(kopprSourceMedias);

        log(`Shuffling Data frames...`);

        resultMedias = [...dfMedia1, ..._.shuffle([...dfMedia2, ...dfMedia3, ...dfMedia4])];

        log(`Data frames Generated...`);

        return resultMedias;
    }

    sortByDate = (unsortedData) => {
        let sortedData = unsortedData.sort(function compare(a, b) {
            var dateA: any = new Date(a?.pubDate);
            var dateB: any = new Date(b?.pubDate);
            return dateA - dateB;
        })?.reverse();

        return sortedData;
    }

    async newestMediaAggES(mediaType, country, limit, otherOptions) {

        let otherFilters: any = {
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

        // Apply last 24 hr condition only for video, blog
        let fetchLast24Hrs = otherOptions?.isAllMediaType && (mediaType !== FEED_MEDIA_TYPES.SNIP && mediaType !== FEED_MEDIA_TYPES.PODCAST);

        fetchLast24Hrs && otherFilters.must?.push({
            "range": {
                "document.pubDate": {
                    "gte": subHours(new Date(), 24)
                }
            }
        });

        // Avoid snips on desktop
        // !otherOptions?.isMobile && otherFilters.mustNot?.push({
        //     "match": {
        //         "document.type": FEED_MEDIA_TYPES.SNIP
        //     }
        // });

        let records = await this.elasticSearch({
            type: KOPPR_SEARCH_INDEX_PREFIX.MEDIA, country, otherFilters, mediaType, limit, sort: [{
                "document.pubDate": { "order": "desc" }
            }]
        });

        return records;
    }

    async mediaFromKopprSourcesAggES(mediaType, country, limit, otherOptions) {

        let kopprChannelIds = await this.getKopprChannelIds();


        let otherFilters: any = {
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

        // TODO: Apply Koppr channels only if available
        (kopprChannelIds && kopprChannelIds?.length > 0) && (
            otherFilters["filter"] = {
                "terms": {
                    "document.channel": kopprChannelIds
                }
            }
        );


        // Avoid snips on desktop
        // !otherOptions?.isMobile && otherFilters.mustNot?.push({
        //     "match": {
        //         "document.type": FEED_MEDIA_TYPES.SNIP
        //     }
        // });

        let records = await this.elasticSearch({
            type: KOPPR_SEARCH_INDEX_PREFIX.MEDIA, country, otherFilters, mediaType, limit, sort: [{
                "document.pubDate": { "order": "desc" }
            }]
        });

        return records;
    }

    mediaFromFollowedChannelsAggES = async (mediaType, userFollowedChs, country, limit, otherOptions) => {

        let otherFilters: any = {
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
                            "gte": subMonths(new Date(), 2)
                        }
                    }
                }
            ]
        };

        // TODO: Apply user followed channels condition only if available
        (userFollowedChs && userFollowedChs?.length > 0) && (
            otherFilters["filter"] = {
                "terms": {
                    "document.channel": userFollowedChs
                }
            }
        );

        // Avoid snips on desktop
        // !otherOptions?.isMobile && otherFilters.mustNot?.push({
        //     "match": {
        //         "document.type": FEED_MEDIA_TYPES.SNIP
        //     }
        // });

        let records = await this.elasticSearch({
            type: KOPPR_SEARCH_INDEX_PREFIX.MEDIA, country, otherFilters, mediaType, limit, sort: [{
                "document.pubDate": { "order": "desc" }
            }]
        });

        return records;
    }

    getHashtagMatchedMediaES = async (mediaType, userInterests, country, limit, otherOptions) => {

        let otherFilters: any = {
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
                            "gte": subMonths(new Date(), 2)
                        }
                    }
                }
            ]
        };

        // Apply user interests condition only if available
        (userInterests && userInterests?.length > 0) && (
            otherFilters["filter"] = {
                "terms": {
                    "document.interests._id": userInterests
                }
            }
        );

        // Avoid snips on desktop
        // !otherOptions?.isMobile && otherFilters.mustNot?.push({
        //     "match": {
        //         "document.type": FEED_MEDIA_TYPES.SNIP
        //     }
        // });

        let records = await this.elasticSearch({
            type: KOPPR_SEARCH_INDEX_PREFIX.MEDIA, country, otherFilters, mediaType, limit, sort: [{
                "document.pubDate": { "order": "desc" }
            }]
        });

        return records;
    }

    getKopprChannelIds = async () => {
        let kopprSrcUrls = ["https://www.koppr.in/feed", "https://www.youtube.com/channel/UC942OdNzoJswXwAl_N5WBYw"];

        let sources = await Source.find({ url: { $in: kopprSrcUrls } }).lean().exec();

        let channels: any = sources.map(source => source?.channel);

        let kopprChannels = await Channel.find({ "_id": { "$in": channels } }) || [];

        let kopprChannelIds = kopprChannels?.map(kopprChannel => ObjectId(kopprChannel?._id));

        if (kopprChannelIds?.length <= 0) {
            log(`"No Koppr channels found in Channels, ingestion may be incomplete!`);
        }
        return kopprChannelIds;
    }

    async getChannelsByPermalink(req: any, res: any) {
        try {
            let isValidAttributes = Object.values(GET_CHANNELS_REQUIRED_PERMALINK_ARGS).every((k) => { return k in req?.body });
            assert.ok(isValidAttributes, `Invalid query string parameters.Please specify exactly these parameters: ${Object.values(GET_CHANNELS_REQUIRED_PERMALINK_ARGS).join(' or ')}`);

            let permalinkName = _.last(req?.body?.permalinkName?.split('/'))

            // Pagination
            let start = Number(req?.body?.start);
            let end = Number(req?.body?.end);

            assert.ok((!isNaN(start) || !isNaN(end)), "Query string parameters <start, end> must be integers.");
            assert.ok(start < end, "Query string parameter <start> must be less than <end>.");
            assert.ok(start >= 0, "start variable should be a positive integer");
            assert.ok(end > 0, "end variable should be a positive integer");

            let filters: any = [];

            permalinkName && (filters.push({
                "term": {
                    "document.permalinkName.keyword": permalinkName
                }
            }));

            let records: any = await this.elasticSearch({
                type: KOPPR_SEARCH_INDEX_PREFIX.CHANNEL, otherFilters: {
                    "must": filters
                }, limit: 1
            });

            let channel: any = _.first(records);
            assert.ok(channel, "Permalink Name is not Found in database.");

            let medias: any = await this.elasticSearch({
                type: KOPPR_SEARCH_INDEX_PREFIX.MEDIA, otherFilters: {
                    "must": [
                        {
                            "match": {
                                "document.channel": channel?._id
                            }
                        }
                    ]
                }, skip: start, limit: end
            });

            return res.status(200).send({ success: true, msg: null, data: medias });
        } catch (err) {
            return res.status(400).send({ success: false, msg: errorFormatterService(err) });
        }
    }

    async editInterest(req: any, res: any) {
        try {
            let { _id } = req.params;
            let { longDescription } = req.body;

            assert.ok(validPermalinkName(req.body.permalinkName), "permalinkName is not URL safe. You may only use alphanumerics, dashes, and underscores.");

            let allowedEditInterest = _.pick(req.body, Object.values(EDIT_INTEREST_VALID_PARAMETERS));

            (Object.keys(req?.body).length > Object.keys(allowedEditInterest).length) && res.status(400).send({
                "msg": "Invalid parameters passes. Valid Parameters are :" + EDIT_INTEREST_VALID_PARAMETERS.PERMALINK_NAME + "or" +
                    EDIT_INTEREST_VALID_PARAMETERS.NAME  
                    + "or " + EDIT_INTEREST_VALID_PARAMETERS.THUMBNAIL_URL
                    + "or " + EDIT_INTEREST_VALID_PARAMETERS.LONG_DESCRIPTION
                    + "or " + EDIT_INTEREST_VALID_PARAMETERS.DESCRIPTION
            });

            assert.ok(validObjectIdRegex(_id), "Invalid Object ID " + _id);

            let interestExists: any = await Interest.exists({ "_id": _id });

            assert.ok((interestExists), "Interest could not be found with id :" + _id);

            let query: any = {};

            query._id = ObjectId(_id);

            let editField = allowedEditInterest;

            let interest = await Interest.findOneAndUpdate(query, editField, { upsert: false, new: true }).exec();

            return res.status(200).send({ success: true, msg: null, data: interest });
        } catch (err) {
            return res.status(400).send({ success: false, msg: errorFormatterService(err) });
        }
    }

    validateArgumentsOverall(req: any) {
        // Validate all required params are present
        let isValidAttributes = Object.values(OVERALL_SEARCH_VALID_PARAMS).every((k) => { return k in req?.query });
        assert.ok(isValidAttributes, `Invalid query string parameters.Please specify exactly these parameters: ${Object.values(OVERALL_SEARCH_VALID_PARAMS).join(' or ')}`);

        let { query, country, mediaType, skip, limit } = req?.query;

        // Pagination
        skip = Number(skip);
        limit = Number(limit);

        // Ensure that skip and limit are valid
        assert.ok((!isNaN(skip) || !isNaN(limit)), "Query string parameters <skip, limit> must be positive integers.");
        assert.ok(skip >= 0, "Query string parameter <skip> must be a positive integer.");
        assert.ok(limit > 0, "Query string parameter <limit> must be a non-zero positive integer.");

        // Check that the country code is valid
        // assert.ok((country === 'all' || country?.length === 2), `Parameter <country> must be a valid two-digit ISO country code, or 'all'.`);
        assert.ok((country?.length === 2), `Parameter <country> must be a valid two-digit ISO country code.`);

        // Ensure that mediaType is valid
        let validMediaType = Object.values(VALID_MEDIA_TYPES)?.some(v => v === mediaType);
        assert.ok(validMediaType, `Query string parameter <mediaType> must be one of ${Object.values(VALID_MEDIA_TYPES).join(' or ')}`);

        country !== 'all' && (country = country?.toUpperCase());

        return { query, country, mediaType, skip, limit };
    }

    validateArgumentsChannels(req: any) {
        // Validate all required params are present
        let isValidAttributes = Object.values(CHANNEL_SEARCH_VALID_PARAMS).every((k) => { return k in req?.query });
        assert.ok(isValidAttributes, `Invalid query string parameters.Please specify exactly these parameters: ${Object.values(CHANNEL_SEARCH_VALID_PARAMS).join(' or ')}`);

        let { query, country, skip, limit } = req?.query;
        skip = Number(skip);
        limit = Number(limit);

        // Pagination
        skip = Number(skip) || 0;
        limit = Number(limit) || 100;

        // Check that the country code is valid
        assert.ok((country?.length === 2), `Parameter <country> must be a valid two-digit ISO country code`);

        country !== 'all' && (country = country?.toUpperCase());

        return { query, country, skip, limit };
    }

    validateArgumentsInterests(req: any) {
        // Validate all required params are present
        let isValidAttributes = Object.values(INTEREST_SEARCH_VALID_PARAMS).every((k) => { return k in req?.query });
        assert.ok(isValidAttributes, `Invalid query string parameters.Please specify exactly these parameters: ${Object.values(INTEREST_SEARCH_VALID_PARAMS).join(' or ')}`);

        let { query, skip, limit } = req?.query;

        // Pagination
        skip = Number(skip) || 0;
        limit = Number(limit) || 100;

        return { query, skip, limit };
    }

    overallSearch = async (req: any, res: any) => {
        try {
            // Validating inputs
            let result = this.validateArgumentsOverall(req);

            // If arguments are valid, get parsed arguments
            const { query, country, mediaType, skip, limit } = result;

            let response: any = {};
            let searchTypes = Object.values(KOPPR_SEARCH_INDEX_PREFIX).filter(st => st !== KOPPR_SEARCH_INDEX_PREFIX.SOURCE);

            for (let searchType of searchTypes) {
                let records = await this.elasticSearch({ type: searchType, query, country, mediaType, skip, limit });
                response[`${searchType}s`] = records || [];
            }

            return res.status(200).send({ success: true, msg: null, results: response });
        } catch (err) {
            log("Error in overallSearch(): ", err);
            return res.status(400).send({ success: false, msg: errorFormatterService(err) });
        }
    }

    getChannelsById = async (req: any, res: any) => {
        try {
            let query: any = {};
            let { _id } = req.query;

            let isValidId = validObjectIdRegex(_id)

            isValidId && (query["document._id"] = _id);
            !isValidId && (query["document.permalinkName"] = _id);

            let channel: any = await Channel.exists(query);
            assert.ok(channel, `Channel id ${_id} does not exist.`);

            // let channels = await Channel.findOne(query).exec();
            let filters: any = [];

            isValidId ? (filters.push({
                "match": {
                    "document._id": _id
                }
            })) : (filters.push({
                "term": {
                    "document.permalinkName.keyword": _id
                }
            }));

            let records: any = await this.elasticSearch({
                type: KOPPR_SEARCH_INDEX_PREFIX.CHANNEL, otherFilters: {
                    "must": filters
                }, limit: 1
            });

            channel = _.first(records);

            return res.status(200).send({ success: true, msg: null, data: channel });
        } catch (err) {
            return res.status(400).send({ success: false, msg: errorFormatterService(err) });
        }
    }

    mediaSearch = async (req: any, res: any) => {

        try {
            // Validating inputs
            let result = this.validateArgumentsOverall(req);

            // If arguments are valid, get parsed arguments
            const { query, country, mediaType, skip, limit } = result;

            let results: any = [];

            results = await this.elasticSearch({ type: KOPPR_SEARCH_INDEX_PREFIX.MEDIA, query, country, mediaType, skip, limit });

            return res.status(200).send({ success: true, msg: null, results });
        } catch (err) {
            log("Error in mediaSearch(): ", err);
            return res.status(400).send({ success: false, msg: errorFormatterService(err) });
        }
    }

    interestSearch = async (req: any, res: any) => {

        try {
            // Validating inputs
            let result = this.validateArgumentsInterests(req);

            // If arguments are valid, get parsed arguments
            const { query, skip, limit } = result;
            let results: any = [];

            results = await this.elasticSearch({ type: KOPPR_SEARCH_INDEX_PREFIX.INTEREST, query, skip, limit });

            // To add unavailable fields which will not be visible otherwise, if empty
            results = results.map(result => {
                result.permalinkName = result?.permalinkName ?? null;
                return result;
            });

            return res.status(200).send({ success: true, msg: null, results });
        } catch (err) {
            return res.status(400).send({ success: false, msg: errorFormatterService(err) });
        }
    }

    channelSearch = async (req: any, res: any) => {

        try {
            // Validating inputs
            let result = this.validateArgumentsChannels(req);

            // If arguments are valid, get parsed arguments
            const { query, country, skip, limit } = result;

            let results: any = [];

            results = await this.elasticSearch({ type: KOPPR_SEARCH_INDEX_PREFIX.CHANNEL, query, country, skip, limit });

            return res.status(200).send({ success: true, msg: null, results });
        } catch (err) {
            log("Error in channelSearch(): ", err);
            return res.status(400).send({ success: false, msg: errorFormatterService(err) });
        }
    }

    getInterestsAggQuery(query: any, skip?: any, limit?: any) {
        return [
            // Text search on query
            {
                "$match": {
                    "$text": { "$search": query }
                }
            },

            // Sort by search ranking, then by published date
            { "$sort": { "score": { "$meta": "textScore" }, "pubDate": -1 } },
            { "$skip": skip },
            { "$limit": limit },
            // Project required fields
            {
                "$project": {
                    "name": true,
                    "permalinkName": true,
                    "score": { "$meta": "textScore" }
                }
            }
        ];
    }

    getChannelsAggQuery(query, country, skip?, limit?) {

        country = country.toLowerCase() == "all" ? { "$exists": true } : { "$eq": country };

        return [
            // Text search on query
            {
                "$match": {
                    country,
                    "$text": { "$search": query },
                    "blocked": false
                }
            },

            // Sort by search ranking, then by published date
            { "$sort": { "score": { "$meta": "textScore" } } },
            { "$skip": skip },
            { "$limit": limit },
            // Project required fields
            {
                "$project": {
                    ...ChannelFieldset,
                    "score": { "$meta": "textScore" }
                }
            }
        ]
    }

    getSnips = async (req: any, res: any) => {
        try {
            const role = req?.user?.roles?.[0].type;

            let query: any = {};

            // Pagination
            const skip = req.body?.skip || 0;
            const limit = req.body?.limit || 10;

            query.type = FEED_MEDIA_TYPES.SNIP;

            if (role !== ROLES.SUPER_ADMIN) {
                // Role based filtering
                query.isActive = true
            }

            const snips: any = await Media.find(query)
                .populate("channel")
                .populate("createdBy")
                .populate("updatedBy")
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: "desc" })
                .lean()
                .exec();

            return res.status(200).send({ success: true, msg: null, snips });
        } catch (err) {
            log("Error in getSnips(): ", err);
            return res
                .status(400)
                .send({ success: false, msg: errorFormatterService(err) });
        }
    };

    fetchSnipsById = async (req: any, res: any) => {
        try {
            const query = req.params._id;

            const snips: any = await Media.findById(query)
                .populate("channel")
                .populate("createdBy")
                .populate("updatedBy")
                .lean()
                .exec();

            return res.status(200).send({ success: true, msg: null, snips });
        } catch (err) {
            log("Error in fetchSnipsById(): ", err);
            return res
                .status(400)
                .send({ success: false, msg: errorFormatterService(err) });
        }
    };

    createSnips = async (req: any, res: any) => {
        try {
            let payload: any = req.body;

            const date = new Date();
            const timeDifference = Math.abs(date.getTimezoneOffset());  //Time difference in minutes
            date.setMinutes(date.getMinutes() + timeDifference);

            const { pubDate, createdAt, updatedAt, longDescription } = req.body
            !pubDate && (payload.pubDate = date);
            !createdAt && (payload.createdAt = date)
            !updatedAt && (payload.updatedAt = date)

            let snips = new Media(payload);
            snips.permalinkName = snips?.permalinkName ? _.kebabCase(snips?.permalinkName) + "-" + snips?._id : _.kebabCase(snips?.title) + "-" + snips?._id;
            snips = await snips.save();

            return res.status(200).send({ success: true, _id: snips?._id })
        } catch (err) {
            log("Error in createSnips(): ", err);
            return res
                .status(400)
                .send({ success: false, msg: errorFormatterService(err) });
        }
    };

    updateSnips = async (req: any, res: any) => {
        try {
            let query: any = {};
            let snips: any = null;
            let payload = req.body;

            req.body?._id && (query._id = req.body?._id);

            let isObjectIdPresent = validObjectIdRegex(_.last(payload['permalinkName'].split("-")));

            if (payload['permalinkName'] && !isObjectIdPresent) {
                payload.permalinkName = _.kebabCase(payload?.permalinkName) + "-" + payload?._id;
            }

            const date = new Date()
            const timeDifference = Math.abs(date.getTimezoneOffset());  //Time difference in minutes
            date.setMinutes(date.getMinutes() + timeDifference);

            const { updatedAt } = req.body
            !updatedAt && (payload.updatedAt = date)

            snips = await Media.findOneAndUpdate(
                query,
                payload,
                { new: true }
            ).exec();

            return res.status(200).send({ success: true, msg: "Snip Updated!" });
        } catch (err) {
            log("Error in updateSnips(): ", err);
            return res
                .status(400)
                .send({ success: false, msg: errorFormatterService(err) });
        }
    };

    deleteSnips = async (req: any, res: any) => {
        try {
            const query = { _id: req.body?._id };
            let payload: any = {};

            const date = new Date()
            const timeDifference = Math.abs(date.getTimezoneOffset());  //Time difference in minutes
            date.setMinutes(date.getMinutes() + timeDifference)

            payload.isActive = false
            const { updatedAt } = req.body

            !updatedAt ? (payload.updatedAt = date) : (payload.updatedAt = req.body?.updatedAt)
            await Media.findOneAndUpdate(query, payload).exec();

            return res.status(200).send({ success: true, msg: "Snips removed." });
        } catch (err) {
            log("Error in deleteSnips(): ", err);
            return res
                .status(400)
                .send({ success: false, msg: errorFormatterService(err) });
        }
    };

    elasticSearch = async (data: any) => {
        let { type, query, mediaType, channel, country, skip, limit, _id, otherFilters, otherOptions, otherQueries, sort = [], aggs = {} } = data;

        let filters: any = [];

        // Country filter
        if (country && country !== 'all') {
            let countryKey = [KOPPR_SEARCH_INDEX_PREFIX.SOURCE, KOPPR_SEARCH_INDEX_PREFIX.CHANNEL].some(s => s === type) ? "document.country" : "document.channelCountry";

            filters.push({
                "match": {
                    [countryKey]: country
                }
            });
        }

        // Media type filter
        (mediaType && mediaType !== 'all') && filters.push({
            "match": {
                "document.type": mediaType
            }
        });

        // _id filter
        (_id) && filters.push({
            "match": {
                "document._id": _id
            }
        });

        // Channel Id filter
        (channel) && filters.push({
            "match": {
                "document.channel": channel
            }
        });

        (query && Object.keys(query)?.length) && filters.push({
            "query_string": {
                query
            }
        });

        let filter: any = {};

        if (filters.length > 0) {
            let otherMustFilters: any = _.isArray(otherFilters?.must) ? otherFilters?.must : [];
            filter["must"] = [...filters, ...(otherMustFilters)];
            delete otherFilters?.['must'];
        }
        log(JSON.stringify({
            index: type + '_index_new',
            body: {
                ...otherOptions,
                "query": otherQueries || {
                    "bool": {
                        ...filter,
                        ...otherFilters
                    }
                }, "from": skip, "size": limit, "sort": sort, "aggs": aggs
            }
        }
            , null, 4));

        const esClient: Client = new ESClient({}).client;

        const result: any = await esClient.search({
            index: type + '_index_new',
            body: {
                ...otherOptions,
                "query": otherQueries || {
                    "bool": {
                        ...filter,
                        ...otherFilters
                    }
                }, "from": skip, "size": limit, "sort": sort, "aggs": aggs
            }
        });

        let records = result?.body?.hits?.hits?.map((feed: any) => {
            return feed?._source?.document
        });

        return records || [];
    }

    /** All migration Methods - Write below this comment */

    migrateSnipsPermalink = async (req: any, res: any) => {
        try {
            let snips = await Media.find({ type: FEED_MEDIA_TYPES.SNIP }).lean().exec();

            let results: any = [];

            for (const snip of snips) {
                let permalinkName = _.kebabCase(snip.permalinkName) + "-" + snip?._id;

                results.push(await Media.findOneAndUpdate({ _id: snip?._id }, { $set: { permalinkName: permalinkName } }, { upsert: false, new: true }));
            }

            return res.send({ success: true, msg: "Snips Migration Complete!" });
        } catch (error) {
            return res.status(500).send({ success: false, msg: "Snips Migration Failed!" });
        }
    }

    /** Migrations Scripts 
     * @description Fills data into permalink 
     *              for interests if it doesn't exists
     */
    generateInterestsPermalink = async (req: any, res: any) => {
        try {
            let interests = await Interest.find().lean().exec();

            await Promise.all(
                interests.map(async (interest) => {
                    // Condition to avoid overwriting existing permalinks
                    if (interest?.permalinkName) {
                        return;
                    }

                    // Generating permalink from name
                    let permalinkName = _.kebabCase(interest?.name);

                    // Updating records with permalink generated
                    await Interest.updateOne({ _id: interest?._id }, { $set: { permalinkName } });
                })
            );

            return res.status(200).send({ success: true, msg: "Permalinks Added" });

        } catch (err) {
            log("Failed to Update permalinks for interests", err);
            return res.status(400).send({ success: false, msg: errorFormatterService(err) });
        }
    }
}
