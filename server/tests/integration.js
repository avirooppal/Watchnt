import assert from 'assert';
import crypto from 'crypto';

const API_URL = 'http://localhost:3001';

async function runTests() {
  console.log('Starting Integration Tests...');
  let token = '';
  let sourceId = '';

  const email = `test-${crypto.randomBytes(4).toString('hex')}@example.com`;
  const password = 'password123';

  try {
    // 1. Register
    let res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    let data = await res.json();
    assert.strictEqual(res.status, 201, `Register failed: ${JSON.stringify(data)}`);
    assert.ok(data.token, 'Token missing from register response');
    console.log('✅ POST /auth/register');

    // 2. Login
    res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    data = await res.json();
    assert.strictEqual(res.status, 200, `Login failed: ${JSON.stringify(data)}`);
    assert.ok(data.token, 'Token missing from login response');
    token = data.token;
    console.log('✅ POST /auth/login');

    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // 3. Create Source
    res = await fetch(`${API_URL}/sources`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        platform: 'youtube',
        sourceUrl: 'https://youtube.com/watch?v=123',
        title: 'Test Video',
        durationSec: 120
      })
    });
    data = await res.json();
    assert.strictEqual(res.status, 201, `Create source failed: ${JSON.stringify(data)}`);
    assert.ok(data.id, 'Source ID missing');
    sourceId = data.id;
    console.log('✅ POST /sources');

    // 4. Create Cards
    const dummyEmbedding1 = new Array(768).fill(0.1);
    const dummyEmbedding2 = new Array(768).fill(0.9);
    
    res = await fetch(`${API_URL}/cards`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        sourceId,
        cards: [
          { title: 'Card 1', summary: 'Summary 1', tags: ['test1'], embedding: dummyEmbedding1 },
          { title: 'Card 2', summary: 'Summary 2', tags: ['test2'], embedding: dummyEmbedding2 }
        ]
      })
    });
    data = await res.json();
    assert.strictEqual(res.status, 201, `Create cards failed: ${JSON.stringify(data)}`);
    assert.strictEqual(data.cardIds.length, 2, 'Should return 2 card IDs');
    console.log('✅ POST /cards');

    // 5. Get Cards
    res = await fetch(`${API_URL}/cards`, { headers: authHeaders });
    data = await res.json();
    assert.strictEqual(res.status, 200, `Get cards failed: ${JSON.stringify(data)}`);
    assert.strictEqual(data.cards.length, 2, 'Should return 2 cards');
    console.log('✅ GET /cards');

    // 6. Search
    res = await fetch(`${API_URL}/search`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        embedding: dummyEmbedding1,
        limit: 1,
        threshold: -1.0 // Ensure it returns something regardless of threshold
      })
    });
    data = await res.json();
    assert.strictEqual(res.status, 200, `Search failed: ${JSON.stringify(data)}`);
    assert.ok(data.results.length > 0, 'Should return at least 1 result');
    assert.strictEqual(data.results[0].title, 'Card 1', 'Closest card should be Card 1');
    console.log('✅ POST /search');

    // 7. Transcribe
    const dummyAudio = Buffer.from('a').toString('base64');
    res = await fetch(`${API_URL}/transcribe`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ audio: dummyAudio, mimeType: 'audio/webm', durationSec: 1 })
    });
    assert.ok([200, 501, 503].includes(res.status), `Transcribe returned unexpected status: ${res.status}`);
    console.log('✅ POST /transcribe');

    // 8. Embed
    res = await fetch(`${API_URL}/embed`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ text: 'test' })
    });
    assert.ok([200, 501, 503].includes(res.status), `Embed returned unexpected status: ${res.status}`);
    if (res.status === 200) {
      data = await res.json();
      assert.strictEqual(data.embedding.length, 768, 'Embedding should be 768 dims');
    }
    console.log('✅ POST /embed');

    // 9. LLM
    res = await fetch(`${API_URL}/llm`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ system: 'sys', user: 'usr' })
    });
    assert.ok([200, 501, 503].includes(res.status), `LLM returned unexpected status: ${res.status}`);
    if (res.status === 200) {
      data = await res.json();
      assert.ok(data.content && data.content[0].type === 'text', 'LLM should match Anthropic shape');
    }
    console.log('✅ POST /llm');

    // 10. Export
    res = await fetch(`${API_URL}/export?format=markdown`, { headers: authHeaders });
    const textData = await res.text();
    assert.strictEqual(res.status, 200, `Export failed: ${textData}`);
    assert.ok(textData.startsWith('# '), 'Export should start with markdown heading');
    console.log('✅ GET /export?format=markdown');

    console.log('\n🎉 All 10 tests passed!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Test failed:');
    console.error(err);
    process.exit(1);
  }
}

runTests();
