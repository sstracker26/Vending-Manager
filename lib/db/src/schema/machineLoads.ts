import { pgTable, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientMachinesTable } from "./clientMachines";
import { operatorsTable } from "./operators";
import { productsTable } from "./products";

export const machineLoadsTable = pgTable("machine_loads", {
  id: serial("id").primaryKey(),
  clientMachineId: integer("client_machine_id").notNull().references(() => clientMachinesTable.id),
  operatorId: integer("operator_id").references(() => operatorsTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const machineLoadItemsTable = pgTable("machine_load_items", {
  id: serial("id").primaryKey(),
  machineLoadId: integer("machine_load_id").notNull().references(() => machineLoadsTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  quantity: numeric("quantity", { precision: 10, scale: 3 }).notNull(),
  purchasePrice: numeric("purchase_price", { precision: 10, scale: 2 }).notNull(),
  salePrice: numeric("sale_price", { precision: 10, scale: 2 }).notNull(),
});

export const insertMachineLoadSchema = createInsertSchema(machineLoadsTable).omit({ id: true, createdAt: true });
export const insertMachineLoadItemSchema = createInsertSchema(machineLoadItemsTable).omit({ id: true });
export type InsertMachineLoad = z.infer<typeof insertMachineLoadSchema>;
export type InsertMachineLoadItem = z.infer<typeof insertMachineLoadItemSchema>;
export type MachineLoad = typeof machineLoadsTable.$inferSelect;
export type MachineLoadItem = typeof machineLoadItemsTable.$inferSelect;
