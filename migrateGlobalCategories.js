/**
 * Migration script to update the product_categories table:
 * 1. Make vendor_id optional to support global categories
 * 2. Add is_global boolean field to identify super admin created categories
 */
const { config } = require('dotenv');
const { Pool } = require('pg');

config();

async function runMigration() {
  console.log('Starting migration: Updating product_categories table for global categories');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Start a transaction
    await pool.query('BEGIN');

    // 1. Make vendor_id column nullable
    console.log('Making vendor_id column nullable...');
    await pool.query(`
      ALTER TABLE product_categories 
      ALTER COLUMN vendor_id DROP NOT NULL;
    `);

    // 2. Add is_global column with default value false
    console.log('Adding is_global column...');
    await pool.query(`
      ALTER TABLE product_categories 
      ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT FALSE;
    `);

    // Commit transaction
    await pool.query('COMMIT');
    console.log('Migration completed successfully');
  } catch (error) {
    // Rollback transaction on error
    await pool.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    // End pool
    await pool.end();
  }
}

// Run the migration
runMigration().catch(console.error);