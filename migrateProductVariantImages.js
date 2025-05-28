import dotenv from 'dotenv';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

dotenv.config();

// Set the WebSocket constructor for Neon database
neonConfig.webSocketConstructor = ws;

/**
 * Update the product_variants table to add images array field
 */
async function runMigration() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  console.log('Running migration to add images array field to product_variants table...');

  try {
    // Check if the images array column exists
    const imagesCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'product_variants' 
        AND column_name = 'images'
      );
    `);

    // Add the images array column if it doesn't exist
    if (!imagesCheck.rows[0].exists) {
      console.log('Adding images array column to product_variants table...');
      await pool.query(`
        ALTER TABLE product_variants
        ADD COLUMN images TEXT[] DEFAULT '{}';
      `);
      
      console.log('Column added successfully!');
      
      // Also update existing variants to copy the imageUrl to the images array if available
      console.log('Copying existing imageUrl values to the new images array...');
      await pool.query(`
        UPDATE product_variants
        SET images = ARRAY[image_url]
        WHERE image_url IS NOT NULL AND image_url != '';
      `);
      
      console.log('Existing images copied successfully!');
    } else {
      console.log('Images array column already exists.');
    }

    console.log('Migration successful!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runMigration();