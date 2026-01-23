/**
 * Database Migration Runner
 *
 * Runs Drizzle migrations against a PostgreSQL database.
 * Used by tests and deployment scripts.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Run all pending migrations
 * @param connectionString - PostgreSQL connection string
 */
export async function runMigrations(connectionString: string): Promise<void> {
  console.log('🔄 Running database migrations...');

  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);

  const migrationsFolder = join(__dirname, '../../migrations');

  await migrate(db, { migrationsFolder });

  await client.end();

  console.log('✅ Migrations completed');
}

// Allow running directly: tsx src/db/migrate.ts
if (import.meta.url === `file://${process.argv[1]}`) {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  runMigrations(connectionString)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}
