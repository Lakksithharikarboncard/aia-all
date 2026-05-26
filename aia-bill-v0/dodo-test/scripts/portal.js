const client = require('./client');

async function main() {
  const customerId = process.argv[2];
  if (!customerId) {
    console.log('Usage: node scripts/portal.js <customer_id>');
    console.log('Example: node scripts/portal.js cus_0Nej5mV3FF8EqFRxwySFK');
    process.exit(1);
  }

  const res = await client.fetch(
    `https://test.dodopayments.com/customers/${customerId}/customer-portal/session`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.DODO_API_KEY}`,
      },
      body: '{}',
    }
  );
  const data = await res.json();

  if (data.link) {
    console.log('\n🔗 Portal link (expires in 24h):');
    console.log(data.link);
  } else {
    console.error('❌ Failed:', JSON.stringify(data));
  }
}

main().catch(err => console.error('Error:', err.message));
