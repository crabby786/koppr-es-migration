import express from "express";
import helmet from "helmet";
import cors from "cors";
import { serializeError } from "serialize-error";
import {
  compressionHandler,
  requestIdTag,
} from "./api/middlewares";
import routes from "./api/routes";
import AppConfig from "./config";
import { DB } from "./db";
import SocketClient from "./lib/socket/SocketClient";
import fileUpload from "express-fileupload";
import { Logger } from "./utils/helper";
const log = Logger.log;

const app = express();
app.use(
  cors({
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  })
);
// Tag every request with id
app.use(requestIdTag);

// Securing from common attacks
app.use(helmet());

// Parse application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

// Parse application/json
app.use(express.json());

// File Upload Middleware
app.use(fileUpload());

// Compress data to reduce load time
app.use(compressionHandler);


DB.connect()
  .then(async () => {
    SocketClient.default = new SocketClient();
    const port = AppConfig.get("express:port");

    app.get("/", async (req: any, res: any) => {
      console.log("Log working!");
      res.send({ msg: "Engine Node Api Routes Working", data: {} });
    });

    app.get("/test-error", async (req: any, res: any) => {
      throw "Test error thrown";
    });

    app.use(routes);

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

    let error = JSON.stringify(serializeError(reason));

    // logErrorToEmail({ errorType, error });
  })
  .on('uncaughtException', async (err) => {
    log(err, 'Uncaught Exception thrown');

    let errorType = "UNCAUGHT EXCEPTION - (Koppr-Engine-APIs)";
    let error = JSON.stringify(serializeError(err));

    // await logErrorToEmail({ errorType, error });

    process.exit(1);
  });
