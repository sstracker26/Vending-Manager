import { pgTable, serial, integer, text, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";
import { machinesTable } from "./machines";

export const clientMachinesTable = pgTable("client_machines", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  machineId: integer("machine_id").notNull().references(() => machinesTable.id),
  machineNumber: text("machine_number").notNull(),
  installedAt: date("installed_at", { mode: "string" }),
  isActive: boolean("is_active").notNull().default(true),
  qrCode: text("qr_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertClientMachineSchema = createInsertSchema(clientMachinesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertClientMachine = z.infer<typeof insertClientMachineSchema>;
export type ClientMachine = typeof clientMachinesTable.$inferSelect;
