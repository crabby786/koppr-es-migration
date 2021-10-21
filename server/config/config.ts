import { Provider } from "nconf";
let nconf = new Provider({});

var currentEnv = process.env.NODE_ENV || "development";
nconf.argv()
    .env()
    .file({ file: require.resolve('./environment/' + currentEnv + '.json') });

export default nconf;