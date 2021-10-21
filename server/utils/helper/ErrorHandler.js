"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getErrorMsg = exports.errorFormatter = void 0;
const serialize_error_1 = require("serialize-error");
const _1 = require(".");
const AppConstants_1 = require("../../lib/AppConstants");
const Logger_1 = require("./Logger");
const errorFormatter = (error) => {
    Logger_1.log("Log from Error Formatter", error);
    const errorCode = getErrorCode(error);
    const errorMsg = getErrorMsg(errorCode, error);
    return {
        success: false,
        error: {
            errorCode,
            errorMsg
        },
        msg: errorMsg
    };
};
exports.errorFormatter = errorFormatter;
const getErrorMsg = (errorCode, error) => {
    var _a, _b;
    let errorMsg = (_a = AppConstants_1.ERROR_MESSAGES === null || AppConstants_1.ERROR_MESSAGES === void 0 ? void 0 : AppConstants_1.ERROR_MESSAGES[errorCode]) !== null && _a !== void 0 ? _a : AppConstants_1.ERROR_MESSAGES === null || AppConstants_1.ERROR_MESSAGES === void 0 ? void 0 : AppConstants_1.ERROR_MESSAGES.E0000;
    if (!(AppConstants_1.ERROR_MESSAGES === null || AppConstants_1.ERROR_MESSAGES === void 0 ? void 0 : AppConstants_1.ERROR_MESSAGES[errorCode])) {
        errorMsg = AppConstants_1.ERROR_MESSAGES === null || AppConstants_1.ERROR_MESSAGES === void 0 ? void 0 : AppConstants_1.ERROR_MESSAGES.E0000;
        let errorType = "Error E000 - (Micro-services)";
        let errorString = JSON.stringify(serialize_error_1.serializeError(error));
        _1.logErrorToEmail({ errorType, error: errorString });
    }
    else {
        errorMsg = AppConstants_1.ERROR_MESSAGES === null || AppConstants_1.ERROR_MESSAGES === void 0 ? void 0 : AppConstants_1.ERROR_MESSAGES[errorCode];
    }
    const templateCodes = [AppConstants_1.ERROR_CODES.E5019, AppConstants_1.ERROR_CODES.E5020];
    if (templateCodes === null || templateCodes === void 0 ? void 0 : templateCodes.some(code => code === errorCode)) {
        let errors = (error === null || error === void 0 ? void 0 : error.errors) ? (_b = Object.values(error === null || error === void 0 ? void 0 : error.errors).map((el) => el === null || el === void 0 ? void 0 : el.message)) === null || _b === void 0 ? void 0 : _b.join(". ") : "";
        errorMsg = _1.putValues(errorMsg, { error, errors });
    }
    return errorMsg;
};
exports.getErrorMsg = getErrorMsg;
const getErrorCode = (error) => {
    switch (true) {
        case error.name == 'CastError':
            return AppConstants_1.ERROR_CODES.E5019;
        case error.name == 'AssertionError [ERR_ASSERTION]':
        case error.name == 'AssertionError':
            return error.toString().replace("AssertionError [ERR_ASSERTION]: ", "");
        case error.name === 'ValidationError':
            return AppConstants_1.ERROR_CODES.E5020;
    }
};
