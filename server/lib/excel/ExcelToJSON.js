"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExcelToJSON = void 0;
const simple_excel_to_json_1 = __importDefault(require("simple-excel-to-json"));
const helper_1 = require("../../utils/helper");
const log = helper_1.Logger.log;
class ExcelToJSON {
    constructor(input, output = null) {
        this.inputFile = input;
        this.outputFile = output;
    }
    async getJSON(options = {}) {
        const parser = new (simple_excel_to_json_1.default.XlsParser)();
        const jsonData = parser.parseXls2Json(this.inputFile, options);
        return jsonData;
    }
}
exports.ExcelToJSON = ExcelToJSON;
