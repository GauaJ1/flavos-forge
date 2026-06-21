async function listProjects() {
  const url = 'https://stitch.googleapis.com/mcp';
  const headers = {
    'X-Goog-Api-Key': 'AQ.Ab8RN6IIQUFIC3f7QoSUtcNohE4OGJ_KDmQPOSxAGkfpFtgOUQ',
    'Content-Type': 'application/json'
  };
  const body = JSON.stringify({
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: {
      name: 'list_projects',
      arguments: {}
    }
  });

  try {
    const res = await fetch(url, { method: 'POST', headers, body });
    const data = await res.json();
    const content = JSON.parse(data.result.content[0].text);
    console.log('Projects count:', content.projects ? content.projects.length : 0);
    if (content.projects) {
      for (const p of content.projects) {
        console.log(`- Title: ${p.title}`);
        console.log(`  Name: ${p.name}`);
        console.log(`  Update Time: ${p.updateTime}`);
      }
    }
  } catch (error) {
    console.error(error);
  }
}

listProjects();
