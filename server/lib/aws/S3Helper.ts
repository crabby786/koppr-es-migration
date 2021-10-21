import AWS from 'aws-sdk';
import AppConfig from "../../config";
import { file } from 'nconf';
import { Logger } from "../../utils/helper";
const log = Logger.log;

const { BUCKET_NAME, IAM_USER_KEY, IAM_USER_SECRET, REGION } = AppConfig.get('aws:s3');

export class S3Helper {
    params: any;
    s3: any;

    constructor(params: any) {
        this.params = params;
        this.init();
    }

    init() {
        this.s3 = new AWS.S3({
            accessKeyId: IAM_USER_KEY,
            secretAccessKey: IAM_USER_SECRET,
            region: REGION
        });
    }

    async upload(filename: string, dir: string, file: any) {
        if (!file) {
            throw "No Files provided!";
        }

        let putParams = {
            Bucket: BUCKET_NAME + dir,
            Key: filename,
            Body: file?.data
        };

        try {
            const response = await this.s3.upload(putParams).promise();
            log(response);
            return response;

        } catch (e) {
            log(e);
        }
    }

    async download(key: string) {

        try {
            let params = {
                Bucket: BUCKET_NAME,
                Key: key,
            };
            let data = await this.s3.getObject(params).promise();
            log(data);

            return data;
        } catch (error) {
            log(error);
            throw error;
        }

    }
}
