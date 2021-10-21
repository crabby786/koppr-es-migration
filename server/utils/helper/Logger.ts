import AppConfig from '../../config';

const DEBUG = AppConfig.get('debug');

export default class Logger {
    static log(...data: any) {
        if (DEBUG !== true) {
            return;
        }
        console.log(...data);
    }
}
let log = Logger.log
export { log }