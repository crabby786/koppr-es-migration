import { serializeError, deserializeError } from "serialize-error";
import { logErrorToEmail, putValues } from ".";
import { ERROR_CODES, ERROR_MESSAGES } from "../../lib/AppConstants";
import { log } from "./Logger";

const errorFormatter = (error) => {

    log("Log from Error Formatter", error);

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

const getErrorMsg = (errorCode, error) => {
    let errorMsg = ERROR_MESSAGES?.[errorCode] ?? ERROR_MESSAGES?.E0000;

    if (!ERROR_MESSAGES?.[errorCode]) {
        errorMsg = ERROR_MESSAGES?.E0000;

        let errorType = "Error E000 - (Micro-services)";

        let errorString = JSON.stringify(serializeError(error));

        logErrorToEmail({ errorType, error: errorString });
    } else {
        errorMsg = ERROR_MESSAGES?.[errorCode];
    }

    // For Cast & Validation Errors
    const templateCodes: any = [ERROR_CODES.E5019, ERROR_CODES.E5020];
    if (templateCodes?.some(code => code === errorCode)) {
        let errors = error?.errors ? Object.values(error?.errors).map((el: any) => el?.message)?.join(". ") : "";
        errorMsg = putValues(errorMsg, { error, errors });
    }

    return errorMsg;
}

const getErrorCode = (error) => {
    switch (true) {
        case error.name == 'CastError':
            return ERROR_CODES.E5019;

        case error.name == 'AssertionError [ERR_ASSERTION]':
        case error.name == 'AssertionError':
            return error.toString().replace("AssertionError [ERR_ASSERTION]: ", "");

        case error.name === 'ValidationError':
            return ERROR_CODES.E5020;
    }

}

export { errorFormatter, getErrorMsg };