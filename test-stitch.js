import fs from 'fs';
import path from 'path';

async function fetchAsset(url, outputPath, isBinary = false) {
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
    console.error(`Error fetching asset from ${url}:`, error);
  }
}

async function main() {
  const dashboardImgUrl = 'https://lh3.googleusercontent.com/aida/AP1WRLv8xtyYYZzGI8_7dozRToJvsyJu9b6uDF2HN1aepNph-EcdDCpCF_oaiBDbdiGuD2JgnWbLGhNNlTsJfUM2yWuuUc2jVA_MURw7xSjqZ1IHGGCLLKFf51vWorXoAW5lQf6bVDntJ0Ez2TcjPhu6jiKdwVGYYKmV_vKJhycIZEHkbOUqmeIfVSgBniuD0RTD0lAHzRei19fWJjHtzguR1KDXK4oRhZyE8L3QO57FDwOS117UNC4ttXmyt8E';
  const dashboardHtmlUrl = 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzg4N2YzMDZjNTc0NzRkZjJhY2JjNDQzYWNiMmQyNjI4EgsSBxCyzqKVjh8YAZIBJAoKcHJvamVjdF9pZBIWQhQxMzQ0NTMyODgyNjcxMTgxMDE2OA&filename=&opi=96797242';

  const artifactDir = 'C:\\Users\\Usuario\\.gemini\\antigravity-ide\\brain\\e88966ad-cd5d-41bc-acff-76bbd6bab468';
  const imgPath = path.join(artifactDir, 'locked_in_dashboard.png');
  const htmlPath = 'c:\\Users\\Usuario\\Pictures\\Flavos-Forge\\dashboard-stitch.html';

  console.log('Fetching dashboard image...');
  await fetchAsset(dashboardImgUrl, imgPath, true);

  console.log('Fetching dashboard HTML...');
  await fetchAsset(dashboardHtmlUrl, htmlPath, false);
}

main().catch(console.error);
