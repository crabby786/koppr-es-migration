import { Provider } from "nconf";
import { Logger } from "../../utils/helper";
const log = Logger.log;

let nconf = new Provider({});
let currentEnv = process.env.NODE_ENV || "development";

try {
    nconf.file({ file: require.resolve(`./environment/${currentEnv}.json`) });
} catch (e) {
    log(e);
}
export default nconf;

