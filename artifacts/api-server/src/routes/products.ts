import { Router, type IRouter } from "express";
import { db, productsTable, stockMovementsTable, changeLogsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  CreateProductBody,
  UpdateProductBody,
  GetProductParams,
  UpdateProductParams,
  DeleteProductParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function getStockQuantity(productId: number): Promise<number> {
  const result = await db
    .select({
      qty: sql<string>`
        COALESCE(SUM(CASE WHEN type = 'in' THEN quantity::numeric ELSE -quantity::numeric END), 0)
      `.as("qty"),
    })
    .from(stockMovementsTable)
    .where(eq(stockMovementsTable.productId, productId));
  return parseFloat(result[0]?.qty ?? "0");
}

router.get("/products", async (_req, res): Promise<void> => {
  const products = await db.select().from(productsTable).orderBy(productsTable.name);
  const result = await Promise.all(products.map(async p => ({
    ...p,
    purchasePrice: parseFloat(p.purchasePrice),
    salePrice: parseFloat(p.salePrice),
    minStockQuantity: parseFloat(p.minStockQuantity),
    stockQuantity: await getStockQuantity(p.id),
    createdAt: p.createdAt.toISOString(),
  })));
  res.json(result);
});

router.post("/products", async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [product] = await db.insert(productsTable).values({
    ...parsed.data,
    purchasePrice: String(parsed.data.purchasePrice),
    salePrice: String(parsed.data.salePrice),
    minStockQuantity: String(parsed.data.minStockQuantity ?? 0),
  }).returning();
  const opId = req.session?.operatorId;
  if (opId) await db.insert(changeLogsTable).values({ operatorId: opId, action: "create", entity: "product", entityId: product.id, details: `Created product: ${product.name}` });
  res.status(201).json({ ...product, purchasePrice: parseFloat(product.purchasePrice), salePrice: parseFloat(product.salePrice), minStockQuantity: parseFloat(product.minStockQuantity), stockQuantity: 0, createdAt: product.createdAt.toISOString() });
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, params.data.id));
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  const stockQuantity = await getStockQuantity(product.id);
  res.json({ ...product, purchasePrice: parseFloat(product.purchasePrice), salePrice: parseFloat(product.salePrice), minStockQuantity: parseFloat(product.minStockQuantity), stockQuantity, createdAt: product.createdAt.toISOString() });
});

router.patch("/products/:id", async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const data: Record<string, unknown> = {};
  if (parsed.data.name != null) data.name = parsed.data.name;
  if (parsed.data.type != null) data.type = parsed.data.type;
  if (parsed.data.purchasePrice != null) data.purchasePrice = String(parsed.data.purchasePrice);
  if (parsed.data.salePrice != null) data.salePrice = String(parsed.data.salePrice);
  if (parsed.data.unit != null) data.unit = parsed.data.unit;
  if (parsed.data.minStockQuantity != null) data.minStockQuantity = String(parsed.data.minStockQuantity);
  if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;
  const [product] = await db.update(productsTable).set(data).where(eq(productsTable.id, params.data.id)).returning();
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  const opId = req.session?.operatorId;
  if (opId) await db.insert(changeLogsTable).values({ operatorId: opId, action: "update", entity: "product", entityId: product.id, details: `Updated product: ${product.name}` });
  const stockQuantity = await getStockQuantity(product.id);
  res.json({ ...product, purchasePrice: parseFloat(product.purchasePrice), salePrice: parseFloat(product.salePrice), minStockQuantity: parseFloat(product.minStockQuantity), stockQuantity, createdAt: product.createdAt.toISOString() });
});

router.delete("/products/:id", async (req, res): Promise<void> => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [product] = await db.delete(productsTable).where(eq(productsTable.id, params.data.id)).returning();
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  const opId = req.session?.operatorId;
  if (opId) await db.insert(changeLogsTable).values({ operatorId: opId, action: "delete", entity: "product", entityId: params.data.id, details: `Deleted product: ${product.name}` });
  res.sendStatus(204);
});

export { getStockQuantity };
export default router;
