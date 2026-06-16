/* =========================================================
   Peaceful Nights Guide — store.js
   Pluggable product storage.

   - If DATABASE_URL is set  -> PostgreSQL (real database)
   - Otherwise               -> a JSON file on disk (local dev / no DB)

   Both expose the same async interface:
     init(seedProducts), list(), upsert(product), remove(id)
   ========================================================= */

const fs = require('fs');
const path = require('path');

function createStore({ dataDir }) {
  if (process.env.DATABASE_URL) {
    return createPostgresStore();
  }
  return createFileStore({ dataDir });
}

/* ---------- PostgreSQL ---------- */
function createPostgresStore() {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Render's managed Postgres uses SSL. Set PGSSL=disable to turn off.
    ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false }
  });

  return {
    kind: 'postgres',

    async init(seedProducts = []) {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS products (
          id       text PRIMARY KEY,
          position integer NOT NULL DEFAULT 0,
          data     jsonb NOT NULL
        )
      `);
      const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM products');
      if (rows[0].n === 0 && seedProducts.length) {
        for (let i = 0; i < seedProducts.length; i++) {
          const p = seedProducts[i];
          await pool.query(
            `INSERT INTO products (id, position, data) VALUES ($1, $2, $3)
             ON CONFLICT (id) DO NOTHING`,
            [p.id, i, p]
          );
        }
        console.log(`Seeded ${seedProducts.length} product(s) into Postgres`);
      }
    },

    async list() {
      const { rows } = await pool.query(
        'SELECT data FROM products ORDER BY position ASC, id ASC'
      );
      return rows.map((r) => r.data);
    },

    async upsert(product) {
      // Only one product can be "featured".
      if (product.featured) {
        await pool.query(
          `UPDATE products SET data = jsonb_set(data, '{featured}', 'false')
           WHERE id <> $1 AND data->>'featured' = 'true'`,
          [product.id]
        );
      }
      const existing = await pool.query('SELECT position FROM products WHERE id = $1', [product.id]);
      let position;
      if (existing.rowCount) {
        position = existing.rows[0].position;
      } else {
        const max = await pool.query('SELECT COALESCE(MAX(position), -1) + 1 AS n FROM products');
        position = max.rows[0].n;
      }
      await pool.query(
        `INSERT INTO products (id, position, data) VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
        [product.id, position, product]
      );
    },

    async remove(id) {
      await pool.query('DELETE FROM products WHERE id = $1', [id]);
    }
  };
}

/* ---------- JSON file (fallback) ---------- */
function createFileStore({ dataDir }) {
  fs.mkdirSync(dataDir, { recursive: true });
  const DB_FILE = path.join(dataDir, 'products.db.json');

  function read() {
    try {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')).products || [];
    } catch {
      return [];
    }
  }
  function write(products) {
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify({ products }, null, 2));
    fs.renameSync(tmp, DB_FILE);
  }

  return {
    kind: 'file',

    async init(seedProducts = []) {
      if (!fs.existsSync(DB_FILE)) {
        write(seedProducts);
        if (seedProducts.length) console.log(`Seeded ${seedProducts.length} product(s) into file store`);
      }
    },

    async list() {
      return read();
    },

    async upsert(product) {
      const products = read();
      if (product.featured) {
        products.forEach((p) => { if (p.id !== product.id) p.featured = false; });
      }
      const idx = products.findIndex((p) => p.id === product.id);
      if (idx >= 0) products[idx] = product;
      else products.push(product);
      write(products);
    },

    async remove(id) {
      write(read().filter((p) => p.id !== id));
    }
  };
}

module.exports = { createStore };
