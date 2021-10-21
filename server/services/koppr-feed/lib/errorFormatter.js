"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function formatter(error) {
    var _a, _b, _c;
    switch (true) {
        case error.name == 'CastError':
            return `Invalid ${error.path}: ${error.value}`;
        case error.name == 'AssertionError [ERR_ASSERTION]':
        case error.name == 'AssertionError':
            return error.toString().replace("AssertionError [ERR_ASSERTION]: ", "");
        case error.code == 11000:
            const value = (error === null || error === void 0 ? void 0 : error.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/)) ? error === null || error === void 0 ? void 0 : error.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0] : (_c = (_b = (_a = error === null || error === void 0 ? void 0 : error.errmsg.split("index:")[1]) === null || _a === void 0 ? void 0 : _a.split("dup key")[0]) === null || _b === void 0 ? void 0 : _b.split("_")[0]) === null || _c === void 0 ? void 0 : _c.trim();
            return `Duplicate field value: ${value}. Please use another value!`;
        case error.name === 'ValidationError':
            const errors = Object.values(error === null || error === void 0 ? void 0 : error.errors).map((el) => el.message);
            return `Invalid input data. ${errors.join('. ')}`;
        case typeof error == 'string':
            return error;
        default:
            return "Something went wrong.";
    }
}
exports.default = formatter;
