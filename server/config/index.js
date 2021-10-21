"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = __importDefault(require("./config"));
class AppConfig {
    static get(path) {
        return config_1.default.get(path);
    }
    static set(path, value) {
        return config_1.default.set(path, value);
    }
    static appName() {
        return AppConfig.get('app_name');
    }
}
exports.default = AppConfig;
