const client = require('./client');

const CUSTOMERS = [
  { email: 'alice@example.com', name: 'Alice Johnson' },
  { email: 'bob@example.com', name: 'Bob Smith' },
  { email: 'carol@example.com', name: 'Carol Williams' },
  { email: 'ayush@dropjar.com', name: 'Ayush' },
];

async function main() {
  // Create customers
  console.log('--- Creating customers ---');
  const customers = [];
  for (const c of CUSTOMERS) {
    const customer = await client.customers.create({
      ...c,
      metadata: { source: 'dodo-test' },
    });
    customers.push(customer);
    console.log(`  ✓ ${customer.name.padEnd(16)} ${customer.email.padEnd(24)} ${customer.customer_id}`);
  }

  // Create a dummy product
  console.log('\n--- Creating product ---');
  const product = await client.products.create({
    name: 'Dummy Product',
    description: 'Test product ($9.99 one-time)',
    price: { type: 'one_time_price', price: 999, currency: 'USD', discount: 0, purchasing_power_parity: false },
    tax_category: 'saas',
  });
  console.log(`  ✓ ${product.name.padEnd(16)} $9.99 USD    ${product.product_id}`);

  // Create checkout session for Ayush
  console.log('\n--- Checkout session for Ayush ---');
  const session = await client.checkoutSessions.create({
    product_cart: [{ product_id: product.product_id, quantity: 1 }],
    customer: { customer_id: customers.find(c => c.email === 'ayush@dropjar.com').customer_id },
    billing: { city: 'New York', country: 'US', state: 'NY', street: '123 Main St', zipcode: '10001' },
    return_url: 'https://example.com/success',
  });
  console.log(`  ✓ ${session.checkout_url}`);

  console.log('\n✅ Setup complete');
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  if (err.body) console.error('  Body:', JSON.stringify(err.body));
  process.exit(1);
});
