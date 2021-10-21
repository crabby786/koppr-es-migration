"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GQLController = exports.RestController = void 0;
const RestController_1 = __importDefault(require("./RestController"));
exports.RestController = RestController_1.default;
const GQLController_1 = __importDefault(require("./GQLController"));
exports.GQLController = GQLController_1.default;
