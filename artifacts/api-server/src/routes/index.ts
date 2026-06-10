import { Router, type IRouter } from "express";
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
router.use(clientsRouter);
router.use(machinesRouter);
router.use(productsRouter);
router.use(operatorsRouter);
router.use(stockRouter);
router.use(machineLoadsRouter);
router.use(schedulesRouter);
router.use(expensesRouter);
router.use(reportsRouter);
router.use(logsRouter);
router.use(dashboardRouter);

export default router;
