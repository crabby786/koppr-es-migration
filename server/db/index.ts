import Mongoose from "mongoose";
import AppConfig from "../config";

let database: Mongoose.Connection;
export class DB {
  static async connect(): Promise<any> {
    return new Promise((resolve, reject) => {
      const { uri, options } = AppConfig.get('mongoDB');

      if (database) {
        return;
      }
      Mongoose.connect(uri, options, (error) => {
        error ? reject(error) : resolve({});
      })
    });
  };

  static async disconnect(): Promise<any> {
    if (!database) {
      return;
    }
    Mongoose.disconnect();
  };
}
