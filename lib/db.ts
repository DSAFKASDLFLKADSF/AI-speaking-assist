import { Pool, type PoolClient, type QueryResultRow } from "pg";
import {
  devQuery,
  devWithTransaction,
  isDevDatabaseEnabled,
} from "@/lib/devDb";

let pool: Pool | undefined;

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim()) || isDevDatabaseEnabled();
}

export function getPool(): Pool {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    if (isDevDatabaseEnabled()) {
      throw new Error(
        "Dev database pool is async — use query()/withTransaction() instead of getPool() in dev mode."
      );
    }
    throw new Error(
      "DATABASE_URL is not configured. Set it in .env.local and restart the server."
    );
  }

  if (!pool) {
    pool = new Pool({ connectionString: url });
  }

  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  if (isDevDatabaseEnabled()) {
    return devQuery<T>(text, params);
  }
  const result = await getPool().query<T>(text, params);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  if (isDevDatabaseEnabled()) {
    return devWithTransaction(fn);
  }

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
