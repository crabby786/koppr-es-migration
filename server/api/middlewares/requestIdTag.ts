import { v4 as uuidv4 } from 'uuid';

export default (req: any, res: any, next: any) => {
    req.id = uuidv4();
    next();
}