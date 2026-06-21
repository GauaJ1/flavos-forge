// Quick integration test for rate limiting fix verification
const BASE = 'http://localhost:5000';

async function test() {
  console.log('=== Flavos Forge Rate Limit Fix Verification ===\n');

  // Step 1: Login
  console.log('1. Logging in...');
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'usertest@example.com', password: 'SecurePassword123!' }),
    credentials: 'include'
  });
  console.log(`   Login: ${loginRes.status} ${loginRes.statusText}`);
  const loginData = await loginRes.json();
  
  if (loginRes.status !== 200) {
    console.log('   ERROR: Login failed. Trying to register...');
    const regRes = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'testlimit@example.com', password: 'SecurePassword123!', name: 'Test Limit' }),
      credentials: 'include'
    });
    console.log(`   Register: ${regRes.status} ${regRes.statusText}`);
    return;
  }
  
  // Extract cookie from Set-Cookie header
  const cookieHeader = loginRes.headers.get('set-cookie');
  const cookieValue = cookieHeader?.match(/forge_session=([^;]+)/)?.[1];
  const cookie = cookieValue ? `forge_session=${cookieValue}` : '';
  console.log(`   Cookie obtained: ${!!cookie}`);

  const headers = {
    'Content-Type': 'application/json',
    'Cookie': cookie
  };

  // Step 2: Test journal creation (was hitting sensitiveLimiter = 10 req/15min)
  console.log('\n2. Testing journal POST (5 rapid entries)...');
  let journalErrors = 0;
  for (let i = 0; i < 5; i++) {
    const res = await fetch(`${BASE}/api/journal`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ content: `Entry ${i+1}: Teste do diário pós-fix. Verificando limite.`, mood: 4 })
    });
    if (res.status === 429) journalErrors++;
    process.stdout.write(`   Entry ${i+1}: ${res.status} `);
  }
  console.log(`\n   Journal errors: ${journalErrors}/5 ${journalErrors === 0 ? '✅ OK' : '❌ STILL RATE LIMITED'}`);

  // Step 3: Test habit creation
  console.log('\n3. Creating a habit...');
  const habitRes = await fetch(`${BASE}/api/habits`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ title: 'Exercitar Diário', cue: 'Às 18h ao chegar em casa', triggerCue: 'Se eu estiver com tênis', action: 'então treino 20 min' })
  });
  console.log(`   Habit creation: ${habitRes.status} ${habitRes.statusText} ${habitRes.status < 400 ? '✅' : '❌'}`);

  let habitId = null;
  if (habitRes.status < 400) {
    const habitData = await habitRes.json();
    habitId = habitData.habit?.id;
    console.log(`   Habit ID: ${habitId}`);
  }

  // Step 4: Test habit check-ins rapidly (was hitting sensitiveLimiter = 10 req/15min)
  if (habitId) {
    console.log('\n4. Testing habit check-in (6 rapid toggles)...');
    let checkinErrors = 0;
    for (let i = 0; i < 6; i++) {
      const date = new Date().toISOString().split('T')[0];
      const res = await fetch(`${BASE}/api/habits/${habitId}/checkin`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ date, completed: i % 2 === 0 })
      });
      if (res.status === 429) checkinErrors++;
      process.stdout.write(`   Checkin ${i+1}: ${res.status} `);
    }
    console.log(`\n   Check-in errors: ${checkinErrors}/6 ${checkinErrors === 0 ? '✅ OK' : '❌ STILL RATE LIMITED'}`);
  }

  // Step 5: Test goal creation
  console.log('\n5. Creating a goal...');
  const goalRes = await fetch(`${BASE}/api/goals`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: 'Correr 5km',
      specificOutcome: 'Completar 5km em menos de 30 minutos',
      metric: 'Tempo de corrida',
      difficulty: 'medium',
      deadline: '2026-08-02',
      actionPlans: [{ triggerCue: 'Se estiver com tênis prontos', action: 'saio para correr no parque' }]
    })
  });
  console.log(`   Goal creation: ${goalRes.status} ${goalRes.statusText} ${goalRes.status < 400 ? '✅' : '❌'}`);
  if (goalRes.status >= 400) {
    const errData = await goalRes.json();
    console.log('   Goal creation error details:', JSON.stringify(errData));
  }

  // Step 6: Test coach insight (should work with coachLimiter = 100 req/15min in dev)
  console.log('\n6. Testing Coach IA insight...');
  const coachRes = await fetch(`${BASE}/api/coach/insight`, { headers });
  console.log(`   Coach insight: ${coachRes.status} ${coachRes.statusText} ${coachRes.status < 400 ? '✅' : '❌'}`);

  console.log('\n=== Test Complete ===');
}

test().catch(err => console.error('Test failed:', err));
