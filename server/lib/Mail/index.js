"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const config_1 = __importDefault(require("../../config"));
const AppConstants_1 = require("../AppConstants");
const { NODE_ENV = 'development' } = process === null || process === void 0 ? void 0 : process.env;
const Logger_1 = __importDefault(require("../../utils/helper/Logger"));
const log = Logger_1.default.log;
const sendMail = async ({ to, cc = '', bcc = "", key, templateVariables, subject, body, others }) => {
    try {
        let { smtps: connectionString, from } = config_1.default.get('nodemailer');
        let transporter = nodemailer_1.default.createTransport(connectionString);
        if (NODE_ENV !== 'production') {
            subject = `[${NODE_ENV === null || NODE_ENV === void 0 ? void 0 : NODE_ENV.toUpperCase()}] -  ${subject}`;
        }
        let options = {
            from: from,
            to: to,
            subject: subject,
            html: body || "NA",
            cc: cc,
            bcc: bcc,
            template: "",
            replyTo: (others === null || others === void 0 ? void 0 : others.replyTo) || AppConstants_1.EMAIL_IDS.CARE,
            attachments: others === null || others === void 0 ? void 0 : others.attachments
        };
        await transporter.sendMail(options);
        log("Email Service Success");
        return {
            success: true,
            data: options,
        };
    }
    catch (e) {
        log("Email Service Error", e);
        return {
            success: false,
            data: e
        };
    }
};
exports.sendMail = sendMail;
