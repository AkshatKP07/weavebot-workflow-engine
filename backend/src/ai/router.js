// backend/src/ai/router.js

export async function executeAI({ provider, modelId, baseUrl, prompt, apiKey }) {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    throw new Error(`Authentication failed: No API key found for provider "${provider}". Please configure and save your key to the vault.`);
  }

  const cleanKey = apiKey.trim();

  // 1. UNIVERSAL (OpenAI, DeepSeek, Groq, Mistral, Local LLMs, OpenRouter)
  if (provider === 'universal') {
    const rawBaseUrl = baseUrl?.trim() || 'https://api.openai.com/v1';
    const normalizedBaseUrl = rawBaseUrl.replace(/\/+$/, '');
    const endpoint = normalizedBaseUrl.endsWith('/chat/completions') 
      ? normalizedBaseUrl 
      : `${normalizedBaseUrl}/chat/completions`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cleanKey}`
      },
      body: JSON.stringify({
        model: modelId?.trim() || 'gpt-4o',
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || `Universal endpoint error (${response.status})`);
    }

    const outputText = data.choices?.[0]?.message?.content || '';
    return { text: outputText, generatedText: outputText, result: outputText };
  }

  // 2. GOOGLE GEMINI (Native REST with Header Auth)
  if (provider === 'gemini') {
    const targetModel = modelId?.trim() || 'gemini-3.8-flash';
    
    // REVERTED to v1beta to ensure compatibility with 1.5 models
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': cleanKey
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || `Gemini API error (${response.status})`);
    }

    const outputText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { text: outputText, generatedText: outputText, result: outputText };
  }

  // 3. ANTHROPIC CLAUDE (Native REST)
  if (provider === 'anthropic') {
    const targetModel = modelId?.trim() || 'claude-3-haiku-20240307';
    const endpoint = 'https://api.anthropic.com/v1/messages';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': cleanKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: targetModel,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || `Anthropic API error (${response.status})`);
    }

    const outputText = data.content?.[0]?.text || '';
    return { text: outputText, generatedText: outputText, result: outputText };
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
}