// Script to add new columns to vendors and product_categories tables
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Required for Neon Serverless
neonConfig.webSocketConstructor = ws;

// Configure for Neon serverless
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:divyesh@127.0.0.1:5432/univendor",
  connectionTimeoutMillis: 5000
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to database...');
    
    // Start transaction
    await client.query('BEGIN');
    
    // Add color_palette column if not exists
    await client.query(`
      ALTER TABLE vendors 
      ADD COLUMN IF NOT EXISTS color_palette text DEFAULT 'default'
    `);
    console.log('Added color_palette column to vendors');
    
    // Add font_settings column if not exists
    await client.query(`
      ALTER TABLE vendors 
      ADD COLUMN IF NOT EXISTS font_settings jsonb
    `);
    console.log('Added font_settings column to vendors');
    
    // Add parent_id column to product_categories if not exists
    await client.query(`
      ALTER TABLE product_categories 
      ADD COLUMN IF NOT EXISTS parent_id integer REFERENCES product_categories(id) ON DELETE SET NULL
    `);
    console.log('Added parent_id column to product_categories');
    
    // Add level column to product_categories if not exists
    await client.query(`
      ALTER TABLE product_categories 
      ADD COLUMN IF NOT EXISTS level integer DEFAULT 1
    `);
    console.log('Added level column to product_categories');
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Migration completed successfully');
    
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    // Release client
    client.release();
    // Close pool
    await pool.end();
    process.exit(0);
  }
}

// Run migration
console.log('Running migration to add new columns to vendors and product_categories tables...');
runMigration();