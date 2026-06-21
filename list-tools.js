async function listTools() {
  const url = 'https://stitch.googleapis.com/mcp';
  const headers = {
    'X-Goog-Api-Key': 'AQ.Ab8RN6IIQUFIC3f7QoSUtcNohE4OGJ_KDmQPOSxAGkfpFtgOUQ',
    'Content-Type': 'application/json'
  };
  const body = JSON.stringify({
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/list',
    params: {}
  });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body
    });
    const data = await res.json();
    const tools = data.result.tools;
    console.log('Tools list:');
    for (const t of tools) {
      console.log(`- ${t.name}: ${t.description}`);
    }
  } catch (error) {
    console.error('Error listing tools:', error);
  }
}

listTools();
