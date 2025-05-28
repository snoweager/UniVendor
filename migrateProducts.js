import pg from 'pg';
const { Pool } = pg;

/**
 * Update the products table to add new price fields
 */
async function runMigration() {
  console.log('Running migration to update products table with new price fields...');
  
  // Connect to the database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    console.log('Connected to database...');
    
    // Start a transaction
    await pool.query('BEGIN');
    
    // Rename price to sellingPrice if it exists
    const checkPriceColumnExists = await pool.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='products' AND column_name='price'
      );
    `);
    
    if (checkPriceColumnExists.rows[0].exists) {
      console.log('Renaming price column to selling_price');
      await pool.query(`ALTER TABLE products RENAME COLUMN price TO selling_price;`);
    } else {
      // Add selling_price column if it doesn't exist
      const checkSellingPriceColumnExists = await pool.query(`
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name='products' AND column_name='selling_price'
        );
      `);
      
      if (!checkSellingPriceColumnExists.rows[0].exists) {
        console.log('Adding selling_price column');
        await pool.query(`ALTER TABLE products ADD COLUMN selling_price NUMERIC;`);
      }
    }
    
    // Add purchase_price if it doesn't exist
    const checkPurchasePriceColumnExists = await pool.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='products' AND column_name='purchase_price'
      );
    `);
    
    if (!checkPurchasePriceColumnExists.rows[0].exists) {
      console.log('Adding purchase_price column');
      await pool.query(`ALTER TABLE products ADD COLUMN purchase_price NUMERIC;`);
    }
    
    // Add mrp if it doesn't exist
    const checkMrpColumnExists = await pool.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='products' AND column_name='mrp'
      );
    `);
    
    if (!checkMrpColumnExists.rows[0].exists) {
      console.log('Adding mrp column');
      await pool.query(`ALTER TABLE products ADD COLUMN mrp NUMERIC;`);
    }
    
    // Add gst if it doesn't exist
    const checkGstColumnExists = await pool.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='products' AND column_name='gst'
      );
    `);
    
    if (!checkGstColumnExists.rows[0].exists) {
      console.log('Adding gst column');
      await pool.query(`ALTER TABLE products ADD COLUMN gst NUMERIC;`);
    }
    
    // Handle compare_at_price to mrp migration if needed
    const checkCompareAtPriceColumnExists = await pool.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='products' AND column_name='compare_at_price'
      );
    `);
    
    if (checkCompareAtPriceColumnExists.rows[0].exists) {
      console.log('Migrating compare_at_price data to mrp');
      await pool.query(`
        UPDATE products 
        SET mrp = compare_at_price 
        WHERE mrp IS NULL AND compare_at_price IS NOT NULL;
      `);
    }
    
    // Commit the transaction
    await pool.query('COMMIT');
    console.log('Migration completed successfully');
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();