// import VaultConfig from 'node-vault-config';
// import { VaultFactory } from 'node-vault-config';
import config from "./config"
export default class AppConfig {

    static get(path: string): any {
        return config.get(path);
    }

    static set(path: string, value: any): any {
        return config.set(path, value);
    }

    // static vault(): VaultConfig {
    //     return VaultFactory.create(AppConfigUtil.get("vault:base"), AppConfigUtil.get("vault_token"));
    // }


    static appName(): string {
        return AppConfig.get('app_name');
    }

}
