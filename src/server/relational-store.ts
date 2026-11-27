import type { DatabaseSchema, DirtyRecords, StoreDataSection } from './db.ts';
import type { Category, Order, OrderItem, Product, ProductVariant, StoreOffer } from '../types/store.ts';

const toIso = (value: unknown, fallback = new Date().toISOString()): string => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' && value) {
    const parsed = new Date(value);
    if (Number.isFinite(parsed.getTime())) return parsed.toISOString();
  }
  return fallback;
};

const toNumberOrNull = (value: unknown): number | null =>
  value === null || value === undefined ? null : Number(value);

const readJsonArray = <T>(value: unknown): T[] =>
  Array.isArray(value) ? value as T[] : [];

export async function loadRelationalStore(
  client: any,
  initial: DatabaseSchema,
  scopes: ReadonlySet<StoreDataSection>
): Promise<DatabaseSchema> {
  const state: DatabaseSchema = {
    version: 1,
    adminUser: { ...initial.adminUser },
    settings: initial.settings,
    categories: [],
    products: [],
    orders: [],
    offers: [],
  };

  const adminResult = await client.query('SELECT id, email, password_hash, salt, session_version, bootstrap_completed, name FROM tolip_admin_users LIMIT 1');
  if (adminResult.rows[0]) {
    const row = adminResult.rows[0];
    state.adminUser = {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      salt: row.salt,
      sessionVersion: row.session_version || undefined,
      bootstrapCompleted: Boolean(row.bootstrap_completed),
      name: row.name,
    };
  }

  if (scopes.has('settings')) {
    const result = await client.query('SELECT payload FROM tolip_store_settings WHERE id = 1');
    if (result.rows[0]?.payload) state.settings = result.rows[0].payload;
  }

  if (scopes.has('categories')) {
    const result = await client.query('SELECT id, name, slug, description, image, sort_order, is_active, created_at FROM tolip_categories ORDER BY sort_order, id');
    state.categories = result.rows.map((row: any): Category => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description || '',
      image: row.image || '',
      sortOrder: Number(row.sort_order) || 0,
      isActive: Boolean(row.is_active),
      createdAt: toIso(row.created_at),
    }));
  }

  if (scopes.has('products')) {
    const productsResult = await client.query('SELECT id, name, slug, category_id, description, features, usage_instructions, images, is_featured, is_best_seller, is_active, in_stock, created_at, updated_at FROM tolip_products ORDER BY created_at DESC, id');
    const variantsResult = await client.query('SELECT id, product_id, name, price, original_price, stock, sku FROM tolip_product_variants ORDER BY product_id, id');

    const variantsByProduct = new Map<string, ProductVariant[]>();
    for (const row of variantsResult.rows) {
      const variants = variantsByProduct.get(row.product_id) || [];
      variants.push({
        id: row.id,
        name: row.name,
        price: toNumberOrNull(row.price),
        originalPrice: toNumberOrNull(row.original_price),
        stock: Number(row.stock) || 0,
        ...(row.sku ? { sku: row.sku } : {}),
      });
      variantsByProduct.set(row.product_id, variants);
    }

    state.products = productsResult.rows.map((row: any): Product => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      categoryId: row.category_id || '',
      description: row.description || '',
      features: readJsonArray<string>(row.features),
      usageInstructions: row.usage_instructions || '',
      images: readJsonArray<string>(row.images),
      variants: variantsByProduct.get(row.id) || [],
      isFeatured: Boolean(row.is_featured),
      isBestSeller: Boolean(row.is_best_seller),
      isActive: Boolean(row.is_active),
      inStock: Boolean(row.in_stock),
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at),
    }));
  }

  if (scopes.has('offers')) {
    const offersResult = await client.query('SELECT id, title, description, image, type, value, bundle_price, buy_quantity, get_quantity, starts_at, ends_at, is_active, created_at, updated_at FROM tolip_offers ORDER BY created_at DESC, id');
    const linksResult = await client.query('SELECT offer_id, product_id FROM tolip_offer_products ORDER BY offer_id, product_id');

    const productsByOffer = new Map<string, string[]>();
    for (const row of linksResult.rows) {
      const ids = productsByOffer.get(row.offer_id) || [];
      ids.push(row.product_id);
      productsByOffer.set(row.offer_id, ids);
    }

    state.offers = offersResult.rows.map((row: any): StoreOffer => ({
      id: row.id,
      title: row.title,
      description: row.description || '',
      image: row.image || '',
      type: row.type,
      productIds: productsByOffer.get(row.id) || [],
      value: Number(row.value) || 0,
      bundlePrice: toNumberOrNull(row.bundle_price),
      buyQuantity: Number(row.buy_quantity) || 1,
      getQuantity: Number(row.get_quantity) || 1,
      startsAt: row.starts_at ? toIso(row.starts_at) : null,
      endsAt: row.ends_at ? toIso(row.ends_at) : null,
      isActive: Boolean(row.is_active),
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at),
    }));
  }

  if (scopes.has('orders')) {
    const ordersResult = await client.query('SELECT id, order_number, customer_details, items_total, delivery_fee, delivery_fee_note, final_total, status, whatsapp_message, created_at, updated_at FROM tolip_orders ORDER BY created_at DESC, id');
    const itemsResult = await client.query('SELECT order_id, line_number, product_id, product_name, variant_id, variant_name, quantity, unit_price, total_price, image FROM tolip_order_items ORDER BY order_id, line_number');

    const itemsByOrder = new Map<string, OrderItem[]>();
    for (const row of itemsResult.rows) {
      const items = itemsByOrder.get(row.order_id) || [];
      items.push({
        productId: row.product_id,
        productName: row.product_name,
        variantId: row.variant_id,
        variantName: row.variant_name,
        quantity: Number(row.quantity) || 0,
        unitPrice: toNumberOrNull(row.unit_price),
        totalPrice: toNumberOrNull(row.total_price),
        ...(row.image ? { image: row.image } : {}),
      });
      itemsByOrder.set(row.order_id, items);
    }

    state.orders = ordersResult.rows.map((row: any): Order => ({
      id: row.id,
      orderNumber: row.order_number,
      customerDetails: row.customer_details,
      items: itemsByOrder.get(row.id) || [],
      itemsTotal: toNumberOrNull(row.items_total),
      deliveryFee: toNumberOrNull(row.delivery_fee),
      ...(row.delivery_fee_note ? { deliveryFeeNote: row.delivery_fee_note } : {}),
      finalTotal: toNumberOrNull(row.final_total),
      status: row.status,
      whatsappMessage: row.whatsapp_message || '',
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at),
    }));
  }

  return state;
}


export interface RelationalPage<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

function makePage<T>(items: T[], page: number, pageSize: number, total: number): RelationalPage<T> {
  const totalPages = Math.ceil(total / pageSize);
  return {
    items,
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1 && totalPages > 0,
  };
}

export async function getRelationalProductPage(
  client: any,
  filters: {
    categoryId?: string;
    search?: string;
    isFeatured?: boolean;
    isBestSeller?: boolean;
    inStockOnly?: boolean;
    includeInactive?: boolean;
    sortBy?: 'price-asc' | 'price-desc' | 'newest' | 'name';
  },
  requestedPage: number,
  pageSize: number
): Promise<RelationalPage<Product>> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    values.push(value);
    conditions.push(sql.replace('?', '$' + values.length));
  };

  if (!filters.includeInactive) conditions.push('p.is_active = true');
  if (filters.categoryId && filters.categoryId !== 'all') add('p.category_id = ?', filters.categoryId);
  if (filters.isFeatured) conditions.push('p.is_featured = true');
  if (filters.isBestSeller) conditions.push('p.is_best_seller = true');
  if (filters.inStockOnly) conditions.push('p.in_stock = true');
  if (filters.search?.trim()) {
    add('(p.name ILIKE ? OR p.description ILIKE ? OR p.features::text ILIKE ?)', `%${filters.search.trim()}%`);
    const valueIndex = values.length;
    // One parameter can be reused for each searchable column.
    conditions[conditions.length - 1] = `(p.name ILIKE $${valueIndex} OR p.description ILIKE $${valueIndex} OR p.features::text ILIKE $${valueIndex})`;
  }

  const whereSql = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const countResult = await client.query(
    `SELECT count(*)::int AS total FROM tolip_products p ${whereSql}`,
    values
  );
  const total = Number(countResult.rows[0]?.total) || 0;
  const totalPages = Math.ceil(total / pageSize);
  const page = Math.min(requestedPage, Math.max(1, totalPages));
  const offset = (page - 1) * pageSize;

  let orderSql = 'p.created_at DESC, p.id ASC';
  if (filters.sortBy === 'name') orderSql = 'p.name ASC, p.id ASC';
  if (filters.sortBy === 'price-asc') {
    orderSql = '(SELECT min(v.price) FROM tolip_product_variants v WHERE v.product_id = p.id) ASC NULLS LAST, p.created_at DESC, p.id ASC';
  }
  if (filters.sortBy === 'price-desc') {
    orderSql = '(SELECT max(v.price) FROM tolip_product_variants v WHERE v.product_id = p.id) DESC NULLS LAST, p.created_at DESC, p.id ASC';
  }

  const pageValues = [...values, pageSize, offset];
  const result = await client.query(
    `SELECT p.id, p.name, p.slug, p.category_id, p.description, p.features,
            p.usage_instructions, p.images, p.is_featured, p.is_best_seller,
            p.is_active, p.in_stock, p.created_at, p.updated_at,
            COALESCE(c.name, 'عام') AS category_name
     FROM tolip_products p
     LEFT JOIN tolip_categories c ON c.id = p.category_id
     ${whereSql}
     ORDER BY ${orderSql}
     LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length}`,
    pageValues
  );

  const ids = result.rows.map((row: any) => row.id);
  const variantsResult = ids.length
    ? await client.query(
      'SELECT id, product_id, name, price, original_price, stock, sku FROM tolip_product_variants WHERE product_id = ANY($1::text[]) ORDER BY product_id, id',
      [ids]
    )
    : { rows: [] };

  const variantsByProduct = new Map<string, ProductVariant[]>();
  for (const row of variantsResult.rows) {
    const variants = variantsByProduct.get(row.product_id) || [];
    variants.push({
      id: row.id,
      name: row.name,
      price: toNumberOrNull(row.price),
      originalPrice: toNumberOrNull(row.original_price),
      stock: Number(row.stock) || 0,
      ...(row.sku ? { sku: row.sku } : {}),
    });
    variantsByProduct.set(row.product_id, variants);
  }

  const items = result.rows.map((row: any): Product => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    categoryId: row.category_id || '',
    categoryName: row.category_name || 'عام',
    description: row.description || '',
    features: readJsonArray<string>(row.features),
    usageInstructions: row.usage_instructions || '',
    images: readJsonArray<string>(row.images),
    variants: variantsByProduct.get(row.id) || [],
    isFeatured: Boolean(row.is_featured),
    isBestSeller: Boolean(row.is_best_seller),
    isActive: Boolean(row.is_active),
    inStock: Boolean(row.in_stock),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  }));

  return makePage(items, page, pageSize, total);
}

export async function getRelationalOrderPage(
  client: any,
  filters: { status?: string; search?: string },
  requestedPage: number,
  pageSize: number
): Promise<RelationalPage<Order>> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    values.push(value);
    conditions.push(sql.replace('?', '$' + values.length));
  };

  if (filters.status && filters.status !== 'all') add('o.status = ?', filters.status);
  if (filters.search?.trim()) {
    values.push(`%${filters.search.trim()}%`);
    const index = values.length;
    conditions.push(`(o.order_number ILIKE $${index} OR o.customer_details->>'fullName' ILIKE $${index} OR o.customer_details->>'phone' ILIKE $${index} OR o.customer_details->>'city' ILIKE $${index})`);
  }

  const whereSql = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const countResult = await client.query(
    `SELECT count(*)::int AS total FROM tolip_orders o ${whereSql}`,
    values
  );
  const total = Number(countResult.rows[0]?.total) || 0;
  const totalPages = Math.ceil(total / pageSize);
  const page = Math.min(requestedPage, Math.max(1, totalPages));
  const offset = (page - 1) * pageSize;
  const pageValues = [...values, pageSize, offset];

  const result = await client.query(
    `SELECT o.id, o.order_number, o.customer_details, o.items_total, o.delivery_fee,
            o.delivery_fee_note, o.final_total, o.status, o.whatsapp_message,
            o.created_at, o.updated_at
     FROM tolip_orders o
     ${whereSql}
     ORDER BY o.created_at DESC, o.id DESC
     LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length}`,
    pageValues
  );

  const ids = result.rows.map((row: any) => row.id);
  const itemsResult = ids.length
    ? await client.query(
      'SELECT order_id, line_number, product_id, product_name, variant_id, variant_name, quantity, unit_price, total_price, image FROM tolip_order_items WHERE order_id = ANY($1::text[]) ORDER BY order_id, line_number',
      [ids]
    )
    : { rows: [] };

  const itemsByOrder = new Map<string, OrderItem[]>();
  for (const row of itemsResult.rows) {
    const items = itemsByOrder.get(row.order_id) || [];
    items.push({
      productId: row.product_id,
      productName: row.product_name,
      variantId: row.variant_id,
      variantName: row.variant_name,
      quantity: Number(row.quantity) || 0,
      unitPrice: toNumberOrNull(row.unit_price),
      totalPrice: toNumberOrNull(row.total_price),
      ...(row.image ? { image: row.image } : {}),
    });
    itemsByOrder.set(row.order_id, items);
  }

  const items = result.rows.map((row: any): Order => ({
    id: row.id,
    orderNumber: row.order_number,
    customerDetails: row.customer_details,
    items: itemsByOrder.get(row.id) || [],
    itemsTotal: toNumberOrNull(row.items_total),
    deliveryFee: toNumberOrNull(row.delivery_fee),
    ...(row.delivery_fee_note ? { deliveryFeeNote: row.delivery_fee_note } : {}),
    finalTotal: toNumberOrNull(row.final_total),
    status: row.status,
    whatsappMessage: row.whatsapp_message || '',
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  }));

  return makePage(items, page, pageSize, total);
}

export async function persistRelationalChanges(
  client: any,
  state: DatabaseSchema,
  dirty: DirtyRecords
): Promise<void> {
  for (const id of dirty.get('products') || []) {
    const product = state.products.find((item) => item.id === id);
    if (!product) {
      await client.query('DELETE FROM tolip_products WHERE id = $1', [id]);
      continue;
    }

    await client.query(
      'INSERT INTO tolip_products (id,name,slug,category_id,description,features,usage_instructions,images,is_featured,is_best_seller,is_active,in_stock,created_at,updated_at) VALUES ($1,$2,$3,NULLIF($4,\'\'),$5,$6::jsonb,$7,$8::jsonb,$9,$10,$11,$12,$13,$14) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,slug=EXCLUDED.slug,category_id=EXCLUDED.category_id,description=EXCLUDED.description,features=EXCLUDED.features,usage_instructions=EXCLUDED.usage_instructions,images=EXCLUDED.images,is_featured=EXCLUDED.is_featured,is_best_seller=EXCLUDED.is_best_seller,is_active=EXCLUDED.is_active,in_stock=EXCLUDED.in_stock,updated_at=EXCLUDED.updated_at',
      [product.id, product.name, product.slug, product.categoryId || '', product.description || '', JSON.stringify(product.features || []), product.usageInstructions || '', JSON.stringify(product.images || []), Boolean(product.isFeatured), Boolean(product.isBestSeller), Boolean(product.isActive), Boolean(product.inStock), product.createdAt, product.updatedAt]
    );

    await client.query('DELETE FROM tolip_product_variants WHERE product_id = $1', [product.id]);
    const variants = product.variants || [];
    if (variants.length > 0) {
      // Batch all variant rows into one statement to shorten exclusive write-lock time.
      await client.query(
        `INSERT INTO tolip_product_variants (id,product_id,name,price,original_price,stock,sku)
         SELECT rows.id, $1, rows.name, rows.price, rows.original_price, rows.stock, rows.sku
         FROM unnest(
           $2::text[], $3::text[], $4::numeric[], $5::numeric[], $6::integer[], $7::text[]
         ) AS rows(id, name, price, original_price, stock, sku)`,
        [
          product.id,
          variants.map((variant) => variant.id),
          variants.map((variant) => variant.name),
          variants.map((variant) => variant.price ?? null),
          variants.map((variant) => variant.originalPrice ?? null),
          variants.map((variant) => Number(variant.stock) || 0),
          variants.map((variant) => variant.sku || null),
        ]
      );
    }
  }

  for (const id of dirty.get('categories') || []) {
    const category = state.categories.find((item) => item.id === id);
    if (!category) {
      await client.query('DELETE FROM tolip_categories WHERE id = $1', [id]);
      continue;
    }

    await client.query(
      'INSERT INTO tolip_categories (id,name,slug,description,image,sort_order,is_active,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,slug=EXCLUDED.slug,description=EXCLUDED.description,image=EXCLUDED.image,sort_order=EXCLUDED.sort_order,is_active=EXCLUDED.is_active',
      [category.id, category.name, category.slug, category.description || '', category.image || '', Number(category.sortOrder) || 0, Boolean(category.isActive), category.createdAt]
    );
  }

  for (const id of dirty.get('offers') || []) {
    const offer = (state.offers || []).find((item) => item.id === id);
    if (!offer) {
      await client.query('DELETE FROM tolip_offers WHERE id = $1', [id]);
      continue;
    }

    await client.query(
      'INSERT INTO tolip_offers (id,title,description,image,type,value,bundle_price,buy_quantity,get_quantity,starts_at,ends_at,is_active,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,image=EXCLUDED.image,type=EXCLUDED.type,value=EXCLUDED.value,bundle_price=EXCLUDED.bundle_price,buy_quantity=EXCLUDED.buy_quantity,get_quantity=EXCLUDED.get_quantity,starts_at=EXCLUDED.starts_at,ends_at=EXCLUDED.ends_at,is_active=EXCLUDED.is_active,updated_at=EXCLUDED.updated_at',
      [offer.id, offer.title, offer.description || '', offer.image || '', offer.type, Number(offer.value) || 0, offer.bundlePrice ?? null, Number(offer.buyQuantity) || 1, Number(offer.getQuantity) || 1, offer.startsAt || null, offer.endsAt || null, Boolean(offer.isActive), offer.createdAt, offer.updatedAt]
    );

    await client.query('DELETE FROM tolip_offer_products WHERE offer_id = $1', [offer.id]);
    if ((offer.productIds || []).length > 0) {
      await client.query(
        'INSERT INTO tolip_offer_products (offer_id, product_id) SELECT $1, unnest($2::text[]) ON CONFLICT DO NOTHING',
        [offer.id, offer.productIds]
      );
    }
  }

  for (const id of dirty.get('orders') || []) {
    const order = state.orders.find((item) => item.id === id);
    if (!order) {
      await client.query('DELETE FROM tolip_orders WHERE id = $1', [id]);
      continue;
    }

    // Public checkout can only create order items for the exact server-generated
    // order ID being persisted in this transaction.
    await client.query("SELECT set_config('app.created_order_id', $1, true)", [order.id]);

    await client.query(
      'INSERT INTO tolip_orders (id,order_number,customer_details,items_total,delivery_fee,delivery_fee_note,final_total,status,whatsapp_message,created_at,updated_at) VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO UPDATE SET order_number=EXCLUDED.order_number,customer_details=EXCLUDED.customer_details,items_total=EXCLUDED.items_total,delivery_fee=EXCLUDED.delivery_fee,delivery_fee_note=EXCLUDED.delivery_fee_note,final_total=EXCLUDED.final_total,status=EXCLUDED.status,whatsapp_message=EXCLUDED.whatsapp_message,updated_at=EXCLUDED.updated_at',
      [order.id, order.orderNumber, JSON.stringify(order.customerDetails), order.itemsTotal ?? null, order.deliveryFee ?? null, order.deliveryFeeNote ?? null, order.finalTotal ?? null, order.status, order.whatsappMessage || '', order.createdAt, order.updatedAt]
    );

    await client.query('DELETE FROM tolip_order_items WHERE order_id = $1', [order.id]);
    if (order.items.length > 0) {
      const items = order.items;
      await client.query(
        `INSERT INTO tolip_order_items (
           order_id,line_number,product_id,product_name,variant_id,variant_name,quantity,unit_price,total_price,image
         )
         SELECT $1, rows.line_number, rows.product_id, rows.product_name, rows.variant_id,
                rows.variant_name, rows.quantity, rows.unit_price, rows.total_price, rows.image
         FROM unnest(
           $2::integer[], $3::text[], $4::text[], $5::text[], $6::text[],
           $7::integer[], $8::numeric[], $9::numeric[], $10::text[]
         ) AS rows(line_number, product_id, product_name, variant_id, variant_name, quantity, unit_price, total_price, image)`,
        [
          order.id,
          items.map((_item, index) => index + 1),
          items.map((item) => item.productId),
          items.map((item) => item.productName),
          items.map((item) => item.variantId),
          items.map((item) => item.variantName),
          items.map((item) => item.quantity),
          items.map((item) => item.unitPrice ?? null),
          items.map((item) => item.totalPrice ?? null),
          items.map((item) => item.image ?? null),
        ]
      );
    }
  }

  if (dirty.has('settings')) {
    await client.query(
      'INSERT INTO tolip_store_settings (id,payload,updated_at) VALUES (1,$1::jsonb,now()) ON CONFLICT (id) DO UPDATE SET payload=EXCLUDED.payload,updated_at=now()',
      [JSON.stringify(state.settings)]
    );
  }

  if (dirty.has('adminUser')) {
    const admin = state.adminUser;
    await client.query(
      'INSERT INTO tolip_admin_users (id,email,password_hash,salt,session_version,bootstrap_completed,name) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email,password_hash=EXCLUDED.password_hash,salt=EXCLUDED.salt,session_version=EXCLUDED.session_version,bootstrap_completed=EXCLUDED.bootstrap_completed,name=EXCLUDED.name',
      [admin.id, admin.email, admin.passwordHash, admin.salt, admin.sessionVersion || null, Boolean(admin.bootstrapCompleted), admin.name]
    );
  }
}
