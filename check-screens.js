async function listAllScreens() {
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
      name: 'list_screens',
      arguments: {
        projectId: '13445328826711810168'
      }
    }
  });

  try {
    const res = await fetch(url, { method: 'POST', headers, body });
    const data = await res.json();
    const content = JSON.parse(data.result.content[0].text);
    console.log('Screens in project 13445328826711810168:');
    if (content.screens) {
      for (const s of content.screens) {
        console.log(`- Title: ${s.title}`);
        console.log(`  Name: ${s.name}`);
        console.log(`  Width: ${s.width}, Height: ${s.height}`);
      }
    } else {
      console.log('No screens property in result:', content);
    }
  } catch (error) {
    console.error(error);
  }
}

listAllScreens();
