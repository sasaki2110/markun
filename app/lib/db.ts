import { sql } from '@vercel/postgres';

export async function query<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  try {
    const result = await sql.query(text, params || []);
    return result.rows as T[];
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export async function queryOne<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const results = await query<T>(text, params);
  return results[0] || null;
}

