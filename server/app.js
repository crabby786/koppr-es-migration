"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const serialize_error_1 = require("serialize-error");
const middlewares_1 = require("./api/middlewares");
const routes_1 = __importDefault(require("./api/routes"));
const config_1 = __importDefault(require("./config"));
const db_1 = require("./db");
const SocketClient_1 = __importDefault(require("./lib/socket/SocketClient"));
const express_fileupload_1 = __importDefault(require("express-fileupload"));
const helper_1 = require("./utils/helper");
const log = helper_1.Logger.log;
const app = express_1.default();
app.use(cors_1.default({
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
}));
app.use(middlewares_1.requestIdTag);
app.use(helmet_1.default());
app.use(express_1.default.urlencoded({ extended: true }));
app.use(express_1.default.json());
app.use(express_fileupload_1.default());
app.use(middlewares_1.compressionHandler);
db_1.DB.connect()
    .then(async () => {
    SocketClient_1.default.default = new SocketClient_1.default();
    const port = config_1.default.get("express:port");
    app.get("/", async (req, res) => {
        console.log("Log working!");
        res.send({ msg: "Engine Node Api Routes Working", data: {} });
    });
    app.get("/test-error", async (req, res) => {
        throw "Test error thrown";
    });
    app.use(routes_1.default);
    app.listen(port, () => {
        return console.log(`server is listening on ${port}`);
    });
})
    .catch((err) => {
    console.log(err, "Database connection failed!");
});
process
    .on('unhandledRejection', async (reason, p) => {
    log(reason, 'Unhandled Rejection at Promise', p);
    let errorType = "UNHANDLED REJECTION - (Koppr-Engine-APIs)";
    let error = JSON.stringify(serialize_error_1.serializeError(reason));
})
    .on('uncaughtException', async (err) => {
    log(err, 'Uncaught Exception thrown');
    let errorType = "UNCAUGHT EXCEPTION - (Koppr-Engine-APIs)";
    let error = JSON.stringify(serialize_error_1.serializeError(err));
    process.exit(1);
});
