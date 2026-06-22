import { type Request, type Response, type NextFunction } from "express";
import { logger } from "../lib/logger";

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.session?.role) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.role) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    if (!roles.includes(req.session.role)) {
      logger.warn(
        { operatorId: req.session.operatorId, role: req.session.role, required: roles },
        "Unauthorized role access attempt"
      );
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}
