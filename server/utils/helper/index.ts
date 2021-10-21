import { EMAIL_IDS, SYSTEM_USER } from "../../lib/AppConstants";
import _ from "lodash";
import AppConfig from "../../config";
import { sendMail } from "../../lib/Mail";
import Handlebars from "handlebars";
import Logger from "./Logger";
const log = Logger.log;

const DEBUG: any = AppConfig.get('debug');


const MMYYYYToDate = (date: any) => {
    // TODO: 1 day less is created for 1st june it o/ps 31st may
    try {
        let [m, y] = date.split(" ");
        date = new Date(`${m}-01-${y}`);
        return date;
    } catch (error) {
        throw error;
    }
}

const logErrorToEmail = async ({ errorType = "", error = "" }) => {

    let options: any = {
        to: ((DEBUG !== true) ? EMAIL_IDS.TECH : EMAIL_IDS.TEST),
        subject: `Error Reporting - ${errorType}`,
        body: `<b>Error Type:</b><h3 style="color: red;">${errorType}</h3><b>Reported On:</b><p>${new Date().toString()}</p> <b>Error:</b><p><code>${error}</code></p>`,
        templateVariables: {
            errorType, error,
            frontendBaseURL: AppConfig.get('frontEnd:baseURL')
        },
        user: SYSTEM_USER,
        module: 'ERROR'
    };

    await sendMail(options);
}

const validISOCode = (code) => {
    return code?.length === 2;
}

const putValues = (content, variables) => {
    let template = Handlebars.compile(content);
    return template(variables);
}

const validURL = (url) => {
    var pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
        '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator

    return !!pattern.test(url);
};

const validPermalinkName = (permalinkName) => {
    var pattern = new RegExp('^[a-zA-Z0-9_.-]*$');
    return !!pattern.test(permalinkName);
}

const validObjectIdRegex = (id) => {
    let checkForValidMongoDbID = new RegExp("^[0-9a-fA-F]{24}$");
    return checkForValidMongoDbID.test(id);
}

const descriptionConverter = (data: any) => {
    const isArray = data instanceof Array;

    data = !isArray ? [data] : data;

    data = data.map((media: any) => {
        if (media.description == null || media.description == "") {
            media.description = media.title;
        }
        return media;
    });

    return !isArray ? _.first(data) : data;
}

const convertStringToBoolean = (dataAsString) => {
    switch (dataAsString.toLowerCase().trim()) {
        case "true": case "1": return true;
        case "false": case "0": case null: return false;
        default: return Boolean(dataAsString);
    }
}




export {
    MMYYYYToDate,
    logErrorToEmail,
    putValues,
    Logger,
    validISOCode,
    validURL,
    validPermalinkName,
    validObjectIdRegex,
    descriptionConverter,
    convertStringToBoolean
}

