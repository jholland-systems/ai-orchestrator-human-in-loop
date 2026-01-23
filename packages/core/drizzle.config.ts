/**
 * Drizzle Kit Configuration
 *
 * Used by drizzle-kit for generating migrations and managing schema.
 */

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/aicd_dev'
  },
  verbose: true,
  strict: true
});
