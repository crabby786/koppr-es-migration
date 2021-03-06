"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
exports.default = (req, res, next) => {
    req.id = uuid_1.v4();
    next();
};
