"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_client_1 = __importDefault(require("socket.io-client"));
const index_1 = __importDefault(require("../../config/index"));
class SocketClient {
    constructor() {
        this.SOCKET_URL = index_1.default.get("integrator:webSocket:baseURL") || "ws://localhost:3000";
        console.log(`Connecting to socket at ${this.SOCKET_URL} ...`);
        this.client = socket_io_client_1.default(this.SOCKET_URL);
        this.client.on("connect", (args) => {
            console.log(`Socket connected`);
            this.listenEvents();
            console.log("Registered socket event listeners.");
        });
    }
    listenEvents() { }
}
exports.default = SocketClient;
