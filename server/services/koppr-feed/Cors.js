"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
let domains = [];
var whitelist = domains.map((domain) => {
    let reg_str = domain.split('.').join('\.') + '$';
    let regex = new RegExp(reg_str);
    return regex;
});
let corsOptionsWhitelist = { origin: whitelist, optionsSuccessStatus: 200 };
exports.default = cors_1.default(corsOptionsWhitelist);
