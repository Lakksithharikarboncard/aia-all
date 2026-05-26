const client = require('./client');

async function main() {
  const res = await client.customers.list();
  const items = res.items || [];
  console.log(`Customers (${items.length}):`);
  items.forEach(c =>
    console.log(`  ${c.customer_id.padEnd(30)} ${(c.name || '').padEnd(18)} ${(c.email || '').padEnd(26)} created:${(c.created_at || '').slice(0, 10)}`)
  );
}

main().catch(err => console.error('Error:', err.message));
