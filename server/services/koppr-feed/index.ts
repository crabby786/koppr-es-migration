import * as express from 'express';
import Cors from './Cors';
import mongoose, { isValidObjectId } from "mongoose";
import { RestController } from './controller';
import { SearchQuery } from './model/db-schemas';
// import Config from "./config"

const router = express.Router();

router.options('*', Cors);
router.use(Cors);



const logSearchQuery = async ({ req, res, next }, { type }) => {
    req.query['user'] = isValidObjectId(req.query?.user) ? req.query?.user : null;

    let data = {
        type,
        user: req.query?.user,
        searchQuery: req.query?.query,
        payload: {
            query: req.query,
            body: req.body,
            params: req.params
        }
    };

    let searchQuery: any = new SearchQuery(data);
    searchQuery = await searchQuery.save();

    next();
};

/* Rest API Handler */
const RestAPI = new RestController({});

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

/* NOTE: API use case is Specific to cron notification */
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
// router.get('/media', RestAPI.getMediaByInterest);

/* Search API */
router.get('/search', (req, res, next) => logSearchQuery({ req, res, next }, { type: 'overall' }), RestAPI.overallSearch);
router.get('/search/medias', (req, res, next) => logSearchQuery({ req, res, next }, { type: 'media' }), RestAPI.mediaSearch);
router.get('/search/interests', (req, res, next) => logSearchQuery({ req, res, next }, { type: 'interest' }), RestAPI.interestSearch);
router.get('/search/channels', (req, res, next) => logSearchQuery({ req, res, next }, { type: 'channel' }), RestAPI.channelSearch);

// get Channels CMS
router.get('/cms/medias/:_id', RestAPI.getMediaByIdForFeedsCms);
router.get('/cms/channels', RestAPI.getChannelsCms);
router.get('/cms/medias', RestAPI.getMediasCms);
router.get('/medias', RestAPI.getMediasNoAuth);
router.get('/list-medias', RestAPI.listMedias);
router.get('/cms/interests/all', RestAPI.getAllInterestCMS);

/* Dashboard Stats API */
router.get('/cms/dashboard/ingested-media-stats', RestAPI.ingestedMediaStats);
router.get('/cms/dashboard/media-count-stats', RestAPI.getMediaCountStats);

/* NOTE: This is a test route used for notification now and will be removed in future */
router.get('/feeds/:_id', RestAPI.getMediaById);

/* NOTE: Migrations Scripts API End-points */
router.get('/generateInterestsPermalink', RestAPI.generateInterestsPermalink);
router.get('/migrate/snips-permalink', RestAPI.migrateSnipsPermalink);


// Media Endpoints for snips
router.get('/snips', RestAPI.getSnips);
router.get('/snips/:_id', RestAPI.fetchSnipsById);
router.patch('/snips/:_id', RestAPI.updateSnips);
router.post('/snips', RestAPI.createSnips);
router.delete('/snips/:_id', RestAPI.deleteSnips);




export default router;
