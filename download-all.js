import fs from 'fs';
import path from 'path';

async function callStitch(method, params) {
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
      name: method,
      arguments: params
    }
  });

  try {
    const res = await fetch(url, { method: 'POST', headers, body });
    const data = await res.json();
    return data;
  } catch (error) {
    console.error(`Error calling ${method}:`, error);
    throw error;
  }
}

async function downloadAsset(url, outputPath, isBinary = false) {
  const headers = {
    'X-Goog-Api-Key': 'AQ.Ab8RN6IIQUFIC3f7QoSUtcNohE4OGJ_KDmQPOSxAGkfpFtgOUQ'
  };

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
    }
    
    if (isBinary) {
      const buffer = await res.arrayBuffer();
      fs.writeFileSync(outputPath, Buffer.from(buffer));
    } else {
      const text = await res.text();
      fs.writeFileSync(outputPath, text);
    }
    console.log(`Saved: ${outputPath}`);
  } catch (error) {
    console.error(`Error saving asset ${outputPath} from ${url}:`, error);
  }
}

async function main() {
  const projectId = '13445328826711810168';
  const artifactDir = 'C:\\Users\\Usuario\\.gemini\\antigravity-ide\\brain\\e88966ad-cd5d-41bc-acff-76bbd6bab468';
  const workspaceDir = 'c:\\Users\\Usuario\\Pictures\\Flavos-Forge';

  console.log('Fetching screens list...');
  const res = await callStitch('list_screens', { projectId });
  const screensContent = JSON.parse(res.result.content[0].text);
  const screens = screensContent.screens;

  console.log(`Found ${screens.length} screens in Stitch.`);

  for (const screen of screens) {
    const title = screen.title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    console.log(`Processing: ${screen.title} (${title})...`);

    if (screen.screenshot && screen.screenshot.downloadUrl) {
      const imgPath = path.join(artifactDir, `stitch_${title}.png`);
      console.log(`Downloading screenshot for ${screen.title}...`);
      await downloadAsset(screen.screenshot.downloadUrl, imgPath, true);
    }

    if (screen.htmlCode && screen.htmlCode.downloadUrl) {
      const htmlPath = path.join(workspaceDir, `stitch_${title}.html`);
      console.log(`Downloading HTML code for ${screen.title}...`);
      await downloadAsset(screen.htmlCode.downloadUrl, htmlPath, false);
    }
  }
}

main().catch(console.error);
