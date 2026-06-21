const projectId = '13445328826711810168';
const designSystem = 'assets/7f55f0d76b8f427a921efb33019df692';

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

async function main() {
  const screensToGenerate = [
    {
      title: 'Auth Screen',
      prompt: 'A mobile login and registration screen for Flavos Forge. Dark mode with warm graphite background (#15131B) and card color (#1E1B26). Form fields for email and password. Buttons for Login, Register, and "Esqueci minha senha" (password recovery with OTP email). Material icons and a clean, high-performance aesthetic. Use forge-teal (#22B8CF) for primary buttons.'
    },
    {
      title: 'Goal Creation Form',
      prompt: 'A mobile Goal Creation and Edit screen for Flavos Forge. Form fields for: Title, Specific Outcome (Goal-Setting theory), Metric (mensurável), Difficulty (Moderate or High), and Deadline. It must have an "Action Plan" section with a required If-Then template ("Se... [gatilho], então... [ação]"). Keep the warm graphite background (#15131B), card-bg (#1E1B26), and use forge-teal (#22B8CF) for primary buttons.'
    },
    {
      title: 'Habit Detail Screen',
      prompt: 'A mobile Habit Detail view screen for Flavos Forge. Displays habit name, consistency in a 30-day rolling window (%) using a beautiful progress ring, freeze button ("Pausar Hábito" using outline, no red color to avoid guilt/punishment), and a daily checklist for the past 30 days. Uses forge-green (#2F9E5C) for active/completed habit rings and highlights.'
    },
    {
      title: 'Journal Editor Screen',
      prompt: 'A mobile Journal Entry writing screen for Flavos Forge. A distraction-free editor text area with writing prompts ("O que travou seu foco hoje? O que destravou?"). Explicit security indicators displaying "Dados privados e criptografados localmente com AES-256-GCM". Mood selection widget (1 to 5 index, using minimal icons). Use forge-teal (#22B8CF) for primary actions.'
    }
  ];

  for (const screen of screensToGenerate) {
    console.log(`Generating: ${screen.title}...`);
    const result = await callStitch('generate_screen_from_text', {
      projectId,
      prompt: screen.prompt,
      deviceType: 'MOBILE',
      modelId: 'GEMINI_3_1_PRO',
      designSystem
    });
    console.log(`Result for ${screen.title}:`, JSON.stringify(result, null, 2));
  }
}

main().catch(console.error);
