"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3Helper = void 0;
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const config_1 = __importDefault(require("../../config"));
const helper_1 = require("../../utils/helper");
const log = helper_1.Logger.log;
const { BUCKET_NAME, IAM_USER_KEY, IAM_USER_SECRET, REGION } = config_1.default.get('aws:s3');
class S3Helper {
    constructor(params) {
        this.params = params;
        this.init();
    }
    init() {
        this.s3 = new aws_sdk_1.default.S3({
            accessKeyId: IAM_USER_KEY,
            secretAccessKey: IAM_USER_SECRET,
            region: REGION
        });
    }
    async upload(filename, dir, file) {
        if (!file) {
            throw "No Files provided!";
        }
        let putParams = {
            Bucket: BUCKET_NAME + dir,
            Key: filename,
            Body: file === null || file === void 0 ? void 0 : file.data
        };
        try {
            const response = await this.s3.upload(putParams).promise();
            log(response);
            return response;
        }
        catch (e) {
            log(e);
        }
    }
    async download(key) {
        try {
            let params = {
                Bucket: BUCKET_NAME,
                Key: key,
            };
            let data = await this.s3.getObject(params).promise();
            log(data);
            return data;
        }
        catch (error) {
            log(error);
            throw error;
        }
    }
}
exports.S3Helper = S3Helper;
