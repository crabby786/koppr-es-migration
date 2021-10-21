import * as express from "express";
const router = express.Router();

/* Services Declaration  */
import Feed from "../services/koppr-feed";

/*  Service Root Routes  */
router.use('/v1', Feed);

export default router;
