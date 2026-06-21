async function getToolInputSchema() {
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
    const res = await fetch(url, { method: 'POST', headers, body });
    const data = await res.json();
    const tool = data.result.tools.find(t => t.name === 'list_screens');
    console.log('list_screens parameters:');
    console.log(JSON.stringify(tool.inputSchema, null, 2));
  } catch (error) {
    console.error(error);
  }
}

getToolInputSchema();
