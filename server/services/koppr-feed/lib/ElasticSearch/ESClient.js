"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ESClient = void 0;
const elasticsearch_1 = require("@elastic/elasticsearch");
const config_1 = __importDefault(require("../../../../config"));
const Logger_1 = require("../../../../utils/helper/Logger");
const { url: URL } = config_1.default.get('elasticSearch');
console.log(URL);
class ESClient {
    constructor(params) {
        this.params = params;
        this.connect();
    }
    connect() {
        var _a;
        try {
            if (this.client) {
                return;
            }
            console.log(URL);
            let url = ((_a = this.params) === null || _a === void 0 ? void 0 : _a.url) || URL;
            Logger_1.log("URL after", url);
            this.client = new elasticsearch_1.Client({ node: url });
        }
        catch (error) {
            Logger_1.log("ES Client error: ", error);
        }
    }
}
exports.ESClient = ESClient;
