"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GUEST_USER = exports.KOPPR_SEARCH_INDEX_PREFIX = exports.INTEREST_SEARCH_VALID_PARAMS = exports.CHANNEL_SEARCH_VALID_PARAMS = exports.OVERALL_SEARCH_VALID_PARAMS = exports.EDIT_INTEREST_VALID_PARAMETERS = exports.VALID_CHANNEL_MEDIA_INFO_TYPES = exports.GET_RECOMMENDATION_MEDIA_REQUIRED_ARGS = exports.GET_CHANNELS_REQUIRED_PERMALINK_ARGS = exports.GET_MEDIA_REQUIRED_ARGS = exports.GET_ALL_REQUIRED_ARGS = exports.ADD_REQUIRED_SOURCE = exports.FEEDBACK_REQUIRED_PARAMS = exports.REACTION_REQUIRED_PARAMS = exports.VALID_REACTIONS = exports.VALID_BOOKMARK_ACTION = exports.POST_BOOKMARK_REQUIRED_PARAMS = exports.GET_USERS_BOOKMARKS_REQUIRED_PARAMS = exports.EDIT_CHANNEL_PARAMETERS = exports.ADD_CHANNEL_PARAMETERS = exports.VALID_INTERESTS = exports.EDIT_SOURCE_PARAMETERS = exports.VALID_MEDIA_TYPES_FOR_INTEREST = exports.VALID_MEDIA_TYPES = exports.GET_SOURCES_REQUIRED_PARAMS = exports.POST_INTERESTS_REQUIRED_PARAMS = exports.VALID_CHANNEL_ACTIONS = exports.ACTIONS_FOLLOW_CHANNELS_REQUIRED_PARAMS = exports.VALID_CHANNEL_MEDIA_TYPES = exports.GET_RECOMMENDATION_CHANNELS_REQUIRED_PARAMS = exports.VALID_INTEREST_ATTRIBUTES = exports.GET_USERS_FOLLOWED_INTERESTS_REQUIRED_PARAMS = exports.GET_TRENDING_MEDIAS_BY_INTEREST = exports.GET_TRENDING_MEDIAS_BY_CHANNEL = exports.GET_TRENDING_MEDIAS = exports.GET_RECENT_MEDIAS_BY_INTEREST = exports.GET_RECENT_MEDIAS_BY_CHANNEL = exports.GET_RECENT_MEDIAS = exports.GET_ALL_MEDIA_REQUIRED_ARGS = exports.VALID_MEDIA_ATTRIBUTES = exports.VALID_CHANNEL_ATTRIBUTES = exports.VALID_CHANNEL_TYPES = exports.GET_CHANNELS_REQUIRED_PARAMS = exports.ENGINE_USER = exports.ERROR_CODES = exports.ERROR_MESSAGES = exports.FEED_CHANNEL_TYPES = exports.FEED_REACTIONS = exports.FEED_MEDIA_TYPES = exports.EMAIL_IDS = exports.RESPONSE_ACTIONS = exports.SYSTEM_USER = exports.COMMUNICATION_MODE = exports.CURRENCY = exports.ACTIONS = exports.SERVICES = exports.ROLES = void 0;
exports.ROLES = Object.freeze({
    EMPLOYEE: "Employee",
    COMPANY_ADMIN: "CompanyAdmin",
    SUPER_ADMIN: "SuperAdmin",
    ADMIN: "Admin",
    FINANCIAL_ADVISOR: "FinancialAdvisor",
    INDIVIDUAL: "Individual"
});
exports.SERVICES = Object.freeze({
    FEED: 'feed',
    FEED_SOURCE: 'feedSource'
});
exports.ACTIONS = Object.freeze({ LIST: 'list', VIEW: 'view', MODIFY: 'modify', DELETE: 'delete', ADD: 'add' });
exports.CURRENCY = { 'INR': 'INR' };
exports.COMMUNICATION_MODE = {
    EMIT: "EMIT",
    LISTEN: "LISTEN"
};
exports.SYSTEM_USER = "5edf2a8dfdbe5ad362a0b0d9";
exports.RESPONSE_ACTIONS = Object.freeze({
    "SIGNOUT": "/signout"
});
exports.EMAIL_IDS = Object.freeze({
    CARE: "care@koppr.in",
    INFO: "info@koppr.in",
    TECH: "tech@koppr.in",
    TEST: "manoj@koppr.in,rahul@koppr.in",
});
exports.FEED_MEDIA_TYPES = Object.freeze({
    PODCAST: "podcast",
    BLOG: "blog",
    VIDEO: "video",
    ALL: "all",
    SNIP: 'snip'
});
exports.FEED_REACTIONS = Object.freeze({
    SMILE: "smile",
    LOVE: "love",
    HOT: "hot",
    SAD: "sad",
    ANGRY: "angry"
});
exports.FEED_CHANNEL_TYPES = Object.freeze({
    PODCAST: "podcast_rss",
    YOUTUBE: "youtube",
    ALL: "all",
    BLOG: "blog",
    SNIP: 'snip'
});
exports.ERROR_MESSAGES = Object.freeze({
    "E0000": "We are unable to process your request right now. Please try again later.",
    "E5001": "Must provide email and password",
    "E5002": "Oops! You are already registered with this E-mail. You may proceed to Sign In page to login further",
    "E5003": "Oops! You are already registered with this Phone No. You may proceed to Sign In page to login further",
    "E5004": "Signup Not Allowed",
    "E5005": "Mandatory details not found",
    "E5006": "User not found",
    "E5007": "Error Sending Notification",
    "E5008": "Invalid token or token expired",
    "E5009": "Invalid number of arguments for the request handler",
    "E5010": "You must be logged in",
    "E5011": "Invalid Email/Password",
    "E5012": "Access not allowed",
    "E5013": "New and Confirm Passwords doesn't match",
    "E5014": "Incorrect old password",
    "E5015": "Invalid Request",
    "E5016": "User doesn't belong to any company",
    "E5017": "Invalid/Missing File, Upload a valid file",
    "E5018": "Failed to Add/Update data",
    "E5019": "Invalid {{error.path}}: {{error.value}}",
    "E5020": "Invalid input data {{errors}}",
    "E5021": "Record not found",
});
exports.ERROR_CODES = Object.assign({}, ...Object.keys(exports.ERROR_MESSAGES).map(key => ({ [key]: key })));
exports.ENGINE_USER = "5edf8bcab7c6d728df5b3939";
exports.GET_CHANNELS_REQUIRED_PARAMS = Object.freeze({
    COUNTRY: "country"
});
exports.VALID_CHANNEL_TYPES = Object.freeze({
    PODCAST: "podcast",
    VIDEO: "video",
    ALL: "all",
    BLOG: "blog",
    SNIP: 'snip'
});
exports.VALID_CHANNEL_ATTRIBUTES = Object.freeze({
    THUMBNAIL_URL: "thumbnailUrl",
    COVER_IMAGE_URL: "coverImageUrl",
    DESCRIPTION: "description",
    NAME: "name",
    BLOCKED: "blocked"
});
exports.VALID_MEDIA_ATTRIBUTES = Object.freeze({
    thumbnailUrl: "thumbnailUrl",
    url: "url",
    description: "description",
    title: "title",
    blocked: "blocked",
    hashtags: "hashtags",
    permalinkName: "permalinkName",
    longDescription: "longDescription"
});
exports.GET_ALL_MEDIA_REQUIRED_ARGS = Object.freeze({
    INTEREST: "interest",
    COUNTRY: "country",
    START: "start",
    END: "end"
});
exports.GET_RECENT_MEDIAS = Object.freeze({
    MEDIA_TYPE: "mediaType",
    COUNTRY: "country",
    SKIP: "skip",
    LIMIT: "limit"
});
exports.GET_RECENT_MEDIAS_BY_CHANNEL = Object.freeze({
    MEDIA_TYPE: "mediaType",
    COUNTRY: "country",
    SKIP: "skip",
    LIMIT: "limit"
});
exports.GET_RECENT_MEDIAS_BY_INTEREST = Object.freeze({
    MEDIA_TYPE: "mediaType",
    COUNTRY: "country",
    SKIP: "skip",
    LIMIT: "limit",
});
exports.GET_TRENDING_MEDIAS = Object.freeze({
    MEDIA_TYPE: "mediaType",
    COUNTRY: "country",
    SKIP: "skip",
    LIMIT: "limit"
});
exports.GET_TRENDING_MEDIAS_BY_CHANNEL = Object.freeze({
    MEDIA_TYPE: "mediaType",
    COUNTRY: "country",
    SKIP: "skip",
    LIMIT: "limit"
});
exports.GET_TRENDING_MEDIAS_BY_INTEREST = Object.freeze({
    MEDIA_TYPE: "mediaType",
    COUNTRY: "country",
    SKIP: "skip",
    LIMIT: "limit",
});
exports.GET_USERS_FOLLOWED_INTERESTS_REQUIRED_PARAMS = Object.freeze({
    USER_ID: "userId"
});
exports.VALID_INTEREST_ATTRIBUTES = Object.freeze({
    NAME: "name",
    PERMALINK_NAME: "permalinkName"
});
exports.GET_RECOMMENDATION_CHANNELS_REQUIRED_PARAMS = Object.freeze({
    USER_ID: 'userId',
    COUNTRY: 'country'
});
exports.VALID_CHANNEL_MEDIA_TYPES = Object.freeze({
    ALL: 'all',
    VIDEO: 'video',
    BLOG: 'blog',
    PODCAST: 'podcast',
    SNIP: 'snip'
});
exports.ACTIONS_FOLLOW_CHANNELS_REQUIRED_PARAMS = Object.freeze({
    USER_ID: 'userId',
    CHANNELS: 'channels',
    ACTION: 'action'
});
exports.VALID_CHANNEL_ACTIONS = Object.freeze({
    FOLLOW: "follow",
    UNFOLLOW: "unfollow"
});
exports.POST_INTERESTS_REQUIRED_PARAMS = Object.freeze({
    USER_ID: "userId",
    ACTION: 'action',
    INTERESTS: 'interests',
});
exports.GET_SOURCES_REQUIRED_PARAMS = Object.freeze({
    MEDIA_TYPE: "mediaType"
});
exports.VALID_MEDIA_TYPES = Object.freeze({
    ALL: 'all',
    VIDEO: 'video',
    BLOG: 'blog',
    PODCAST: 'podcast',
    SNIP: 'snip'
});
exports.VALID_MEDIA_TYPES_FOR_INTEREST = Object.freeze({
    ALL: 'all',
    VIDEO: 'video',
    BLOG: 'blog',
    PODCAST: 'podcast',
    SNIP: 'snip'
});
exports.EDIT_SOURCE_PARAMETERS = Object.freeze({
    NAME: "name",
    INGESTION_ACTIVE: "ingestionActive",
    URL: "url",
    MEDIA_TYPE: "type",
    channel: "channel",
});
exports.VALID_INTERESTS = Object.freeze({
    AUTOMOTIVE_FINANCE: "Automotive Finance",
    BANKING: "Banking",
    BONDS: "Bonds",
    BUDGETING_SAVINGS: "Budgeting & Savings",
    COMMODITIES: "Commodities",
    ECONOMY_GOVERNMENT: "Economy & Government",
    ESTATE_PLANNING: "Estate Planning",
    FAMILY_FINANCE: "Family Finance",
    FUNDING: "Funding",
    FUTURE_OPTIONS: "Futures and Options",
    GOLD_INVESTMENTS: "Gold Investments",
    HOME_OWNERSHIP: "Home Ownership",
    IPO: "IPO",
    INSURANCE: "Insurance",
    INVESTMENT_PLANNING: "Investment Planning",
    LOANS: "Loans",
    MARKETS: "Markets",
    MUTUAL_FUNDS: "Mutual Funds",
    PERSONAL_FINANCE: "Personal Finance",
    STOCK_MARKETS: "Stock Markets",
    TAX_PLANNING: "Tax Planning",
    VALUE_INVESTING: "Value Investing",
    WEALTH: "Wealth",
    MISCELLANEOUS: "Miscellaneous"
});
exports.ADD_CHANNEL_PARAMETERS = Object.freeze({
    THUMBNAIL_URL: 'thumbnailUrl',
    DESCRIPTION: 'description',
    NAME: 'name',
    BLOCKED: 'blocked',
    TAGLINE: 'tagline',
    PERMALINK_NAME: "permalinkName",
    BANNER: "banner",
    COUNTRY: "country",
    BANNER_LARGE: "bannerLarge"
});
exports.EDIT_CHANNEL_PARAMETERS = Object.freeze({
    THUMBNAIL_URL: 'thumbnailUrl',
    DESCRIPTION: 'description',
    NAME: 'name',
    BLOCKED: 'blocked',
    TAGLINE: 'tagline',
    PERMALINK_NAME: "permalinkName",
    BANNER: "banner",
    BANNER_LARGE: "bannerLarge",
    LONG_DESCRIPTION: "longDescription",
    COUNTRY: "country",
    USER: "user",
});
exports.GET_USERS_BOOKMARKS_REQUIRED_PARAMS = Object.freeze({
    USER_ID: "userId"
});
exports.POST_BOOKMARK_REQUIRED_PARAMS = Object.freeze({
    USER_ID: "userId",
    MEDIA: "media",
    ACTION: "action"
});
exports.VALID_BOOKMARK_ACTION = Object.freeze({
    ADD: "add",
    REMOVE: "remove"
});
exports.VALID_REACTIONS = Object.freeze({
    SMILE: 'smile',
    LOVE: 'love',
    HOT: 'hot',
    SAD: 'sad',
    ANGRY: 'angry'
});
exports.REACTION_REQUIRED_PARAMS = Object.freeze({
    USER_ID: "userId",
    MEDIA: "media",
    ACTION: "reaction"
});
exports.FEEDBACK_REQUIRED_PARAMS = Object.freeze({
    USER_ID: "userId",
    MEDIA: "media",
    FEEDBACK: "feedback"
});
exports.ADD_REQUIRED_SOURCE = Object.freeze({
    URL: "url",
    MEDIA_TYPE: "mediaType",
    channel: "channel",
    NAME: "name",
    INGESTION_ACTIVE: "ingestionActive"
});
exports.GET_ALL_REQUIRED_ARGS = Object.freeze({
    INTEREST: "interest",
    COUNTRY: "country",
    START: "start",
    END: "end"
});
exports.GET_MEDIA_REQUIRED_ARGS = Object.freeze({
    START: "start",
    END: "end"
});
exports.GET_CHANNELS_REQUIRED_PERMALINK_ARGS = Object.freeze({
    START: "start",
    END: "end",
    PERMALINK_NAME: "permalinkName"
});
exports.GET_RECOMMENDATION_MEDIA_REQUIRED_ARGS = Object.freeze({
    START: "start",
    END: "end",
    USER_ID: 'userId',
    MEDIA_TYPE: 'mediaType'
});
exports.VALID_CHANNEL_MEDIA_INFO_TYPES = Object.freeze({
    ALL: 'all',
    VIDEO: 'video',
    BLOG: 'blog',
    PODCAST: 'podcast',
    SNIP: 'snip'
});
exports.EDIT_INTEREST_VALID_PARAMETERS = Object.freeze({
    PERMALINK_NAME: 'permalinkName',
    NAME: 'name',
    THUMBNAIL_URL: "thumbnailUrl",
    LONG_DESCRIPTION: "longDescription",
    DESCRIPTION: "description",
});
exports.OVERALL_SEARCH_VALID_PARAMS = Object.freeze({
    QUERY: 'query',
    COUNTRY: 'country',
    MEDIA_TYPE: 'mediaType',
    SKIP: 'skip',
    LIMIT: 'limit'
});
exports.CHANNEL_SEARCH_VALID_PARAMS = Object.freeze({
    QUERY: 'query',
    COUNTRY: 'country'
});
exports.INTEREST_SEARCH_VALID_PARAMS = Object.freeze({
    QUERY: 'query'
});
exports.KOPPR_SEARCH_INDEX_PREFIX = Object.freeze({
    MEDIA: "media",
    INTEREST: "interest",
    CHANNEL: "channel",
    SOURCE: "source"
});
exports.GUEST_USER = 'guest_user';
