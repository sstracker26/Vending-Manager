import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { operatorsTable } from "./operators";

export const changeLogsTable = pgTable("change_logs", {
  id: serial("id").primaryKey(),
  operatorId: integer("operator_id").notNull().references(() => operatorsTable.id),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: integer("entity_id"),
  details: text("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertChangeLogSchema = createInsertSchema(changeLogsTable).omit({ id: true, createdAt: true });
export type InsertChangeLog = z.infer<typeof insertChangeLogSchema>;
export type ChangeLog = typeof changeLogsTable.$inferSelect;
