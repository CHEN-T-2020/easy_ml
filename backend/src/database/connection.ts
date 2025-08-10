import { Pool, Client } from 'pg';

// Database connection configuration
export class DatabaseConnection {
  private static pool: Pool | null = null;

  static getPool(): Pool {
    if (!DatabaseConnection.pool) {
      const connectionString = process.env.DATABASE_URL;
      
      if (!connectionString) {
        throw new Error('DATABASE_URL environment variable is not set');
      }

      DatabaseConnection.pool = new Pool({
        connectionString,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Handle pool errors
      DatabaseConnection.pool.on('error', (err) => {
        console.error('Unexpected error on idle client', err);
      });
    }

    return DatabaseConnection.pool;
  }

  static async query(text: string, params?: any[]): Promise<any> {
    const pool = DatabaseConnection.getPool();
    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      console.error('Database query error', { text, error });
      throw error;
    }
  }

  static async close(): Promise<void> {
    if (DatabaseConnection.pool) {
      await DatabaseConnection.pool.end();
      DatabaseConnection.pool = null;
    }
  }

  // Health check
  static async healthCheck(): Promise<boolean> {
    try {
      const result = await DatabaseConnection.query('SELECT 1 as ok');
      return result.rows[0].ok === 1;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
}

// For cases where you need a dedicated client (transactions)
export async function getClient() {
  const pool = DatabaseConnection.getPool();
  return await pool.connect();
}