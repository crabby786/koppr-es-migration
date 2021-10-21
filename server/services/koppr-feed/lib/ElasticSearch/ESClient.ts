import { Client } from "@elastic/elasticsearch";
import AppConfig from "../../../../config";
import { log } from "../../../../utils/helper/Logger";

const { url: URL } = AppConfig.get('elasticSearch');

console.log(URL);

export class ESClient {
    params: any;
    client: Client | any;

    constructor(params: any) {
        this.params = params;
        this.connect();
    }

    connect() {
        try {
            if (this.client) {
                return;
            }
            console.log(URL);
            let url = this.params?.url || URL;
            log("URL after", url);
            this.client = new Client({ node: url });
        } catch (error) {
            log("ES Client error: ", error);
        }

    }
}