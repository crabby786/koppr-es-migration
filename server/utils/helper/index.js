"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertStringToBoolean = exports.descriptionConverter = exports.validObjectIdRegex = exports.validPermalinkName = exports.validURL = exports.validISOCode = exports.Logger = exports.putValues = exports.logErrorToEmail = exports.MMYYYYToDate = void 0;
const AppConstants_1 = require("../../lib/AppConstants");
const lodash_1 = __importDefault(require("lodash"));
const config_1 = __importDefault(require("../../config"));
const Mail_1 = require("../../lib/Mail");
const handlebars_1 = __importDefault(require("handlebars"));
const Logger_1 = __importDefault(require("./Logger"));
exports.Logger = Logger_1.default;
const log = Logger_1.default.log;
const DEBUG = config_1.default.get('debug');
const MMYYYYToDate = (date) => {
    try {
        let [m, y] = date.split(" ");
        date = new Date(`${m}-01-${y}`);
        return date;
    }
    catch (error) {
        throw error;
    }
};
exports.MMYYYYToDate = MMYYYYToDate;
const logErrorToEmail = async ({ errorType = "", error = "" }) => {
    let options = {
        to: ((DEBUG !== true) ? AppConstants_1.EMAIL_IDS.TECH : AppConstants_1.EMAIL_IDS.TEST),
        subject: `Error Reporting - ${errorType}`,
        body: `<b>Error Type:</b><h3 style="color: red;">${errorType}</h3><b>Reported On:</b><p>${new Date().toString()}</p> <b>Error:</b><p><code>${error}</code></p>`,
        templateVariables: {
            errorType, error,
            frontendBaseURL: config_1.default.get('frontEnd:baseURL')
        },
        user: AppConstants_1.SYSTEM_USER,
        module: 'ERROR'
    };
    await Mail_1.sendMail(options);
};
exports.logErrorToEmail = logErrorToEmail;
const validISOCode = (code) => {
    return (code === null || code === void 0 ? void 0 : code.length) === 2;
};
exports.validISOCode = validISOCode;
const putValues = (content, variables) => {
    let template = handlebars_1.default.compile(content);
    return template(variables);
};
exports.putValues = putValues;
const validURL = (url) => {
    var pattern = new RegExp('^(https?:\\/\\/)?' +
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' +
        '((\\d{1,3}\\.){3}\\d{1,3}))' +
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' +
        '(\\?[;&a-z\\d%_.~+=-]*)?' +
        '(\\#[-a-z\\d_]*)?$', 'i');
    return !!pattern.test(url);
};
exports.validURL = validURL;
const validPermalinkName = (permalinkName) => {
    var pattern = new RegExp('^[a-zA-Z0-9_.-]*$');
    return !!pattern.test(permalinkName);
};
exports.validPermalinkName = validPermalinkName;
const validObjectIdRegex = (id) => {
    let checkForValidMongoDbID = new RegExp("^[0-9a-fA-F]{24}$");
    return checkForValidMongoDbID.test(id);
};
exports.validObjectIdRegex = validObjectIdRegex;
const descriptionConverter = (data) => {
    const isArray = data instanceof Array;
    data = !isArray ? [data] : data;
    data = data.map((media) => {
        if (media.description == null || media.description == "") {
            media.description = media.title;
        }
        return media;
    });
    return !isArray ? lodash_1.default.first(data) : data;
};
exports.descriptionConverter = descriptionConverter;
const convertStringToBoolean = (dataAsString) => {
    switch (dataAsString.toLowerCase().trim()) {
        case "true":
        case "1": return true;
        case "false":
        case "0":
        case null: return false;
        default: return Boolean(dataAsString);
    }
};
exports.convertStringToBoolean = convertStringToBoolean;
