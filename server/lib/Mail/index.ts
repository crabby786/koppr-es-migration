import nodemailer from "nodemailer";
import AppConfig from "../../config";
import { EMAIL_IDS } from "../AppConstants";
const { NODE_ENV = 'development' } = process?.env;
import  Logger  from "../../utils/helper/Logger";
const log = Logger.log;

const sendMail = async ({ to, cc = '', bcc = "", key, templateVariables, subject, body, others }) => {
    try {
        let { smtps: connectionString, from } = AppConfig.get('nodemailer');
        let transporter = nodemailer.createTransport(connectionString);

        if (NODE_ENV !== 'production') {
            subject = `[${NODE_ENV?.toUpperCase()}] -  ${subject}`;
        }

        let options = {
            from: from,
            to: to,
            subject: subject,
            html: body || "NA",
            cc: cc,
            bcc: bcc,
            template: "",
            replyTo: others?.replyTo || EMAIL_IDS.CARE,
            attachments: others?.attachments
        }
        await transporter.sendMail(options)
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
}

export { sendMail };