"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nconf_1 = require("nconf");
let nconf = new nconf_1.Provider({});
var currentEnv = process.env.NODE_ENV || "development";
nconf.argv()
    .env()
    .file({ file: require.resolve('./environment/' + currentEnv + '.json') });
exports.default = nconf;
