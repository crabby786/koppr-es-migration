"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = __importDefault(require("../config"));
let database;
class DB {
    static async connect() {
        return new Promise((resolve, reject) => {
            const { uri, options } = config_1.default.get('mongoDB');
            if (database) {
                return;
            }
            mongoose_1.default.connect(uri, options, (error) => {
                error ? reject(error) : resolve({});
            });
        });
    }
    ;
    static async disconnect() {
        if (!database) {
            return;
        }
        mongoose_1.default.disconnect();
    }
    ;
}
exports.DB = DB;
