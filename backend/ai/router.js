// backend/ai/router.js
import _ from 'lodash';

export async function executeAI({ provider, prompt }) {
  if (!prompt) throw new Error("Prompt is empty.");

  switch (provider) {
    case 'gemini':
      return await runGemini(prompt);
    
    case 'openai':
      return await runOpenAI(prompt);
      
    case 'anthropic':
      return await runAnthropic(prompt);

    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

async function runGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing");

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  
  return {
    generatedText: data.candidates[0].content.parts[0].text,
    rawResponse: data
  };
}

async function runOpenAI(prompt) {
  const apiKey = process.env.OPENAI_API_KEY; // You'll need to add this to .env later
  if (!apiKey) throw new Error("OPENAI_API_KEY is missing");

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);

  return {
    generatedText: data.choices[0].message.content,
    rawResponse: data
  };
}

async function runAnthropic(prompt) {
  // Placeholder for Claude integration
  return { generatedText: "Claude integration pending...", rawResponse: {} };
}