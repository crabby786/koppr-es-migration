import * as jwt from "jsonwebtoken";
import AppConfig from "../../config";

export const generateToken = (user: any, key?: any) => {
    const { kopprKey, expiresIn } = AppConfig.get('jwt');
    return jwt.sign({ userID: user?._id, user, sessionID: user.sessionID }, key ?? kopprKey, { expiresIn });
}


/*
32 char uuid as session id
store session id and token
uuid: {
    token: value
}
exp 24hrs

dont return user object

get user from session id

return permission object

manoj@xyz.com employee

session id: token


role -> permissions -> route access allowed or not

users/add

empl

users: {
    add: false,
    edit: true,
    list: false,
    delete: true
}

company admin

users {
    add: true,
    edit: false,
    list: false,
    delete: true
}


after login show


*/