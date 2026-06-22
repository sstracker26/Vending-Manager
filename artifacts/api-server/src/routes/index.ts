import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import healthRouter from "./health";
import authRouter from "./auth";
import clientsRouter from "./clients";
import machinesRouter from "./machines";
import productsRouter from "./products";
import operatorsRouter from "./operators";
import stockRouter from "./stock";
import machineLoadsRouter from "./machineLoads";
import schedulesRouter from "./schedules";
import expensesRouter from "./expenses";
import reportsRouter from "./reports";
import logsRouter from "./logs";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(requireAuth, clientsRouter);
router.use(requireAuth, machinesRouter);
router.use(requireAuth, productsRouter);
router.use(requireAuth, operatorsRouter);
router.use(requireAuth, stockRouter);
router.use(requireAuth, machineLoadsRouter);
router.use(requireAuth, schedulesRouter);
router.use(requireAuth, expensesRouter);
router.use(requireAuth, reportsRouter);
router.use(requireAuth, logsRouter);
router.use(requireAuth, dashboardRouter);

export default router;
