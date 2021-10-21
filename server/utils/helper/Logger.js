"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = void 0;
const config_1 = __importDefault(require("../../config"));
const DEBUG = config_1.default.get('debug');
class Logger {
    static log(...data) {
        if (DEBUG !== true) {
            return;
        }
        console.log(...data);
    }
}
exports.default = Logger;
let log = Logger.log;
exports.log = log;
