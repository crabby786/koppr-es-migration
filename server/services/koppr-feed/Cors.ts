import cors from 'cors';

// let domains: string[] = Config.get('cors_domains');
let domains: string[] = [];

var whitelist: RegExp[] = domains.map((domain) => {


    let reg_str = domain.split('.').join('\.') + '$';
    let regex = new RegExp(reg_str);
    return regex;
})

let corsOptionsWhitelist = { origin: whitelist, optionsSuccessStatus: 200 };


export default cors(corsOptionsWhitelist);