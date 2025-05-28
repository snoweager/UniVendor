import dotenv from 'dotenv';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

dotenv.config();

// Set the WebSocket constructor for Neon database
neonConfig.webSocketConstructor = ws;

/**
 * Update the product_variants table to add color and size fields
 */
async function runMigration() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  console.log('Running migration to add color and size fields to product_variants table...');

  try {
    // Check if the table exists first
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'product_variants'
      );
    `);

    // If table doesn't exist, create it
    if (!tableCheck.rows[0].exists) {
      console.log('Creating product_variants table...');
      await pool.query(`
        CREATE TABLE product_variants (
          id SERIAL PRIMARY KEY,
          product_id INTEGER NOT NULL REFERENCES products(id),
          color TEXT NOT NULL,
          size TEXT NOT NULL,
          sku TEXT,
          barcode TEXT,
          purchase_price NUMERIC,
          selling_price NUMERIC NOT NULL,
          mrp NUMERIC,
          gst NUMERIC,
          inventory_quantity INTEGER DEFAULT 0,
          weight NUMERIC,
          image_url TEXT,
          position INTEGER DEFAULT 0,
          is_default BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Table created successfully!');
    } else {
      // Check if columns already exist
      const colorCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'product_variants' 
          AND column_name = 'color'
        );
      `);

      const sizeCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'product_variants' 
          AND column_name = 'size'
        );
      `);

      // Add columns if they don't exist
      if (!colorCheck.rows[0].exists) {
        console.log('Adding color column...');
        await pool.query(`
          ALTER TABLE product_variants
          ADD COLUMN color TEXT NOT NULL DEFAULT 'Default';
        `);
      }

      if (!sizeCheck.rows[0].exists) {
        console.log('Adding size column...');
        await pool.query(`
          ALTER TABLE product_variants
          ADD COLUMN size TEXT NOT NULL DEFAULT 'One Size';
        `);
      }
      
      console.log('Table updated successfully!');
    }

    console.log('Migration successful!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runMigration();