const client = require('./client');

async function main() {
  const res = await client.products.list();
  const items = res.items || [];
  console.log(`Products (${items.length}):`);
  items.forEach(p =>
    console.log(`  ${p.product_id.padEnd(30)} ${(p.name || '').padEnd(20)} ${p.price?.currency || ''} ${(p.price?.price ?? '')}`)
  );
}

main().catch(err => console.error('Error:', err.message));
