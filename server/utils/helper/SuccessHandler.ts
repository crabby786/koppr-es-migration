import { log } from "./Logger";

export const successFormatter = (code , data) => {
    return {code, ...data};
}

