import { Pool, neonConfig } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import ws from 'ws';

// Configure Neon to use the WebSocket constructor
neonConfig.webSocketConstructor = ws;

dotenv.config();

// Check if DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set in environment variables');
  process.exit(1);
}

// Create a connection pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function addGlobalCategoryColumn() {
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    // Check if the column already exists
    const checkColumnResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'product_categories' 
      AND column_name = 'is_global'
    `);
    
    // If the column doesn't exist, add it
    if (checkColumnResult.rows.length === 0) {
      console.log('Adding is_global column to product_categories table...');
      await client.query(`
        ALTER TABLE product_categories 
        ADD COLUMN is_global BOOLEAN DEFAULT FALSE
      `);
      console.log('Column added successfully!');
    } else {
      console.log('is_global column already exists in product_categories table');
    }
    
    // Commit the transaction
    await client.query('COMMIT');
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('Error adding column:', error);
    throw error;
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

// Run the migration
addGlobalCategoryColumn()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });