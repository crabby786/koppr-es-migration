import xls from 'simple-excel-to-json';
import { Logger } from "../../utils/helper";
const log = Logger.log;

export class ExcelToJSON {
    inputFile: any;
    outputFile: string | null;

    constructor(input: any, output: any = null) {
        this.inputFile = input;
        this.outputFile = output;
    }

    async getJSON(options: any = {}) {
        const parser = new (xls.XlsParser)();
        const jsonData = parser.parseXls2Json(this.inputFile, options);
        return jsonData;
    }

}
// node_xj = require("xls-to-json");
// node_xj({
//     input: "sample.xls",  // input xls
//     output: "output.json", // output json
//     sheet: "sheetname",  // specific sheetname
//     rowsToSkip: 5 // number of rows to skip at the top of the sheet; defaults to 0
// }, function (err, result) {
//     if (err) {
//         console.error(err);
//     } else {
//         log(result);
//     }
// });
