import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products";
import { clientMachinesTable } from "./clientMachines";
import { operatorsTable } from "./operators";

export const stockMovementsTable = pgTable("stock_movements", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  type: text("type").notNull(),
  reason: text("reason").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 3 }).notNull(),
  clientMachineId: integer("client_machine_id").references(() => clientMachinesTable.id),
  notes: text("notes"),
  operatorId: integer("operator_id").references(() => operatorsTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStockMovementSchema = createInsertSchema(stockMovementsTable).omit({ id: true, createdAt: true });
export type InsertStockMovement = z.infer<typeof insertStockMovementSchema>;
export type StockMovement = typeof stockMovementsTable.$inferSelect;
