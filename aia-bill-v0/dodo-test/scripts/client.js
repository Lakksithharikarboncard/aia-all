const DodoPayments = require('dodopayments');
require('dotenv').config();

const API_KEY = process.env.DODO_API_KEY;
const ENV = process.env.DODO_ENV || 'test_mode';

if (!API_KEY) {
  console.error('❌ DODO_API_KEY not set. Create a .env file with your key.');
  process.exit(1);
}

module.exports = new DodoPayments({ bearerToken: API_KEY, environment: ENV });
