import io from "socket.io-client";
import AppConfig from "../../config/index"

export default class SocketClient {
  static default: SocketClient;
  client: io.Socket;

  readonly SOCKET_URL = AppConfig.get("integrator:webSocket:baseURL") || "ws://localhost:3000";

  constructor() {
    console.log(`Connecting to socket at ${this.SOCKET_URL} ...`);
    this.client = io(this.SOCKET_URL);
    this.client.on("connect", (args) => {
      console.log(`Socket connected`);
      this.listenEvents();
      console.log("Registered socket event listeners.")
    });
  }

  private listenEvents() { }

}
