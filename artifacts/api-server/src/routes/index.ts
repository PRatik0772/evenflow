import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import eventsRouter from "./events.js";
import checkoutRouter from "./checkout.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(eventsRouter);
router.use(checkoutRouter);

export default router;
