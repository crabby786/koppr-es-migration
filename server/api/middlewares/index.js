"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestIdTag = exports.compressionHandler = void 0;
const compressionHandler_1 = __importDefault(require("./compressionHandler"));
exports.compressionHandler = compressionHandler_1.default;
const requestIdTag_1 = __importDefault(require("./requestIdTag"));
exports.requestIdTag = requestIdTag_1.default;
