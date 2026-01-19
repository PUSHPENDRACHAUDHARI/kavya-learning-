// apiSmoke.js
// Run small API checks against running backend at http://localhost:5000
// Usage: node apiSmoke.js

const BASE = process.env.BASE || 'http://localhost:5000';

async function post(path, body) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await res.text().catch(()=>null);
  let json = null;
  try { json = JSON.parse(text); } catch(e) { json = text; }
  return { status: res.status, body: json };
}

async function run() {
  console.log('\n== POST /api/ai/verify-upi (valid) ==');
  console.log(await post('/api/ai/verify-upi', { upi: 'alice@upi', gateway: 'googlepay' }));

  console.log('\n== POST /api/ai/verify-upi (invalid) ==');
  console.log(await post('/api/ai/verify-upi', { upi: 'invalid-upi' }));

  console.log('\n== POST /api/ai/process-payment ==');
  console.log(await post('/api/ai/process-payment', { method: 'Card', amount: '519', details: { card: '4242424242424242' } }));

  console.log('\n== POST /api/ai/chat ==');
  console.log(await post('/api/ai/chat', { message: 'hello from smoke' }));
}

run().catch(err => { console.error('Error running apiSmoke:', err); process.exit(2); });
