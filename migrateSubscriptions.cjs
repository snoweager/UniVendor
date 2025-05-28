const { pool, db } = require('./server/db');
const { sql } = require('drizzle-orm');

/**
 * Apply subscription model schema changes
 */
async function runMigration() {
  console.log('Starting subscription model migration...');
  
  try {
    // Update subscription_plans table to add new fields
    await db.execute(sql`
      ALTER TABLE subscription_plans 
      ADD COLUMN IF NOT EXISTS yearly_price NUMERIC,
      ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 7,
      ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS stripe_price_id_monthly TEXT,
      ADD COLUMN IF NOT EXISTS stripe_price_id_yearly TEXT
    `);
    console.log('✅ Added new columns to subscription_plans table');

    // Update platform_subscriptions table to add new fields
    await db.execute(sql`
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
    console.log('✅ Added new columns to platform_subscriptions table');

    // Create default subscription plans if none exist
    const plansExist = await db.execute(sql`SELECT COUNT(*) FROM subscription_plans`);
    const count = parseInt(plansExist.rows[0].count, 10);
    
    if (count === 0) {
      console.log('Creating default subscription plans...');
      
      // Basic Plan
      await db.execute(sql`
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
      await db.execute(sql`
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
      await db.execute(sql`
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

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});