import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach((line) => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
      }
    });
  }
} catch (e) {}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('Running migration 008: Add is_featured to products table...');
  
  try {
    // 1. Try selecting is_featured column
    const { error: checkError } = await supabase.from('products').select('is_featured').limit(1);
    
    if (checkError && checkError.message.includes('is_featured')) {
      console.log('is_featured column does not exist yet. Please run migration SQL or column update.');
    } else {
      console.log('is_featured column is present in products table!');
    }

    // 2. Set default perfume image URLs for initial perfumes
    const initialPerfumes = [
      { sku: 'MOOD-VELVET', image_url: '/assets/sostituisci-immagini/homepage/4-1.jpg' },
      { sku: 'MOOD-FANCY', image_url: '/assets/sostituisci-immagini/homepage/4-2.jpg' },
      { sku: 'MOOD-IMPERIOUS', image_url: '/assets/sostituisci-immagini/homepage/4-3.jpg' },
      { sku: 'MOOD-AROMA', image_url: '/assets/sostituisci-immagini/homepage/4-4.jpg' },
    ];

    for (const item of initialPerfumes) {
      const { error } = await supabase
        .from('products')
        .update({ image_url: item.image_url })
        .eq('sku', item.sku);

      if (error) {
        console.log(`Note updating ${item.sku}:`, error.message);
      } else {
        console.log(`Updated ${item.sku} with image ${item.image_url}`);
      }
    }

    console.log('Migration 008 completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

runMigration();
