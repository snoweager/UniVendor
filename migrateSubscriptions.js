// Script to update subscription-related tables
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Required for Neon Serverless
neonConfig.webSocketConstructor = ws;

// Configure for Neon serverless
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to database...');
    
    // Start transaction
    await client.query('BEGIN');
    
    // Update subscription_plans table
    await client.query(`
      ALTER TABLE subscription_plans 
      ADD COLUMN IF NOT EXISTS yearly_price NUMERIC,
      ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 7,
      ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS stripe_price_id_monthly TEXT,
      ADD COLUMN IF NOT EXISTS stripe_price_id_yearly TEXT
    `);
    console.log('✅ Added new columns to subscription_plans table');

    // Check if the platform_subscriptions table exists, if not create it
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'platform_subscriptions'
      )
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('Creating platform_subscriptions table...');
      
      await client.query(`
        CREATE TABLE platform_subscriptions (
          id SERIAL PRIMARY KEY,
          vendor_id INTEGER NOT NULL REFERENCES vendors(id),
          plan_id INTEGER NOT NULL REFERENCES subscription_plans(id),
          status TEXT NOT NULL DEFAULT 'trialing',
          start_date TIMESTAMP NOT NULL DEFAULT NOW(),
          end_date TIMESTAMP,
          trial_ends_at TIMESTAMP,
          current_period_start TIMESTAMP,
          current_period_end TIMESTAMP,
          cancel_at_period_end BOOLEAN DEFAULT FALSE,
          renewal_date TIMESTAMP,
          billing_cycle TEXT NOT NULL DEFAULT 'monthly',
          amount NUMERIC,
          currency TEXT DEFAULT 'USD',
          payment_method_id INTEGER,
          stripe_customer_id TEXT,
          stripe_subscription_id TEXT,
          canceled_at TIMESTAMP,
          cancel_reason TEXT,
          payment_failure_count INTEGER DEFAULT 0,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✅ Created platform_subscriptions table');
    } else {
      // The table exists, so just update it with new columns
      console.log('Updating platform_subscriptions table...');
      
      await client.query(`
        ALTER TABLE platform_subscriptions 
        ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMP,
        ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP,
        ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS amount NUMERIC,
        ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
        ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
        ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
        ADD COLUMN IF NOT EXISTS payment_failure_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS metadata JSONB
      `);
      console.log('✅ Updated platform_subscriptions table');
    }
    console.log('✅ Added new columns to platform_subscriptions table');

    // Create default subscription plans if none exist
    const plansExist = await client.query('SELECT COUNT(*) FROM subscription_plans');
    const count = parseInt(plansExist.rows[0].count, 10);
    
    if (count === 0) {
      console.log('Creating default subscription plans...');
      
      // Basic Plan
      await client.query(`
        INSERT INTO subscription_plans (
          name, description, price, yearly_price, features, 
          product_limit, storage_limit, custom_domain_limit, 
          support_level, is_active, is_default, trial_days
        ) VALUES (
          'Basic', 
          'Perfect for small businesses just getting started with e-commerce', 
          29.99, 
          299.99, 
          ARRAY['Up to 50 products', '5GB storage', '1 custom domain', 'Email support'], 
          50, 
          5000, 
          1, 
          'basic', 
          TRUE, 
          TRUE, 
          7
        )
      `);
      
      // Pro Plan
      await client.query(`
        INSERT INTO subscription_plans (
          name, description, price, yearly_price, features, 
          product_limit, storage_limit, custom_domain_limit, 
          support_level, is_active, trial_days
        ) VALUES (
          'Pro', 
          'For growing businesses with expanded inventory needs', 
          79.99, 
          799.99, 
          ARRAY['Up to 500 products', '20GB storage', '3 custom domains', 'Priority support', 'Advanced analytics', 'Automated inventory alerts'], 
          500, 
          20000, 
          3, 
          'priority', 
          TRUE, 
          7
        )
      `);
      
      // Business Plan
      await client.query(`
        INSERT INTO subscription_plans (
          name, description, price, yearly_price, features, 
          product_limit, storage_limit, custom_domain_limit, 
          support_level, is_active, trial_days
        ) VALUES (
          'Business', 
          'Enterprise-grade solution for established online retailers', 
          149.99, 
          1499.99, 
          ARRAY['Unlimited products', '100GB storage', '10 custom domains', 'Premium support', 'Advanced analytics', 'API access', 'Dedicated account manager'], 
          10000, 
          100000, 
          10, 
          'premium', 
          TRUE, 
          7
        )
      `);
      
      console.log('✅ Default subscription plans created');
    } else {
      console.log('Subscription plans already exist, skipping default plan creation');
    }

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
console.log('Running subscription model migration...');
runMigration();