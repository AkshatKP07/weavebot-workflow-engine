// backend/src/integrations/registry.js

// 1. The Registry (Used by the frontend to fetch available apps/actions)
export const INTEGRATION_REGISTRY = {
  discord: { name: 'Discord', actions: ['send_channel_message', 'send_embed'] },
  slack: { name: 'Slack', actions: ['post_channel_message', 'post_bot_alert'] },
  email: { name: 'Resend Email', actions: ['send_email'] },
  custom_api: { name: 'Custom API', actions: ['custom_request'] }
};

// 2. The Core Execution Logic
export const execute = async (provider, action, config, credentials = {}) => {
  console.log(`🚀 [INTEGRATION] Dispatching to provider: ${provider}`);
  
  try {
    switch (provider) {
      case 'discord': {
        // Smart URL extraction: Handle both strings and objects
        let url = null;
        if (typeof credentials === 'string') {
          url = credentials; // Frontend saved it as a raw string
        } else if (credentials) {
          url = credentials.webhookUrl || credentials.apiKey || credentials.data || credentials.url; // Saved as object
        }
        
        if (!url) {
          console.log("🚨 [DEBUG] Worker received these credentials from vault:", credentials);
          throw new Error("Missing Discord Webhook URL in Vault");
        }
        
        // Safely extract the message text from the node configuration
        const messageContent = config.message || config.content || config.text || JSON.stringify(config);
        
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: messageContent })
        });
        return { success: res.ok, status: res.status };
      }

      case 'slack': {
        const url = credentials?.webhookUrl || credentials?.apiKey;
        if (!url) throw new Error("Missing Slack Webhook URL in Vault");
        
        const messageContent = config.message || config.content || config.text || JSON.stringify(config);
        
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: messageContent })
        });
        return { success: res.ok, status: res.status };
      }

      case 'email': {
        const key = credentials?.apiKey;
        if (!key) throw new Error("Missing Resend API Key in Vault");
        
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'WeaveBot <onboarding@resend.dev>', 
            to: config.toAddress,
            subject: config.subject,
            html: `<p>${config.body || config.message}</p>`
          })
        });
        const data = await res.json();
        return { success: res.ok, provider: 'resend', response: data };
      }

      case 'custom_api': {
        const url = config.customUrl || config.url;
        const token = credentials?.token || credentials?.apiKey;
        
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        const res = await fetch(url, {
          method: config.method || 'POST',
          headers,
          body: typeof config.body === 'string' ? config.body : JSON.stringify(config.body)
        });
        
        let responseData;
        const text = await res.text();
        try { responseData = JSON.parse(text); } catch { responseData = text; }
        
        return { success: res.ok, status: res.status, response: responseData };
      }

      default:
        console.warn(`⚠️ [INTEGRATION] Unknown provider '${provider}'. Simulating success.`);
        return { success: true, simulated: true, provider };
    }
  } catch (error) {
    console.error(`❌ [INTEGRATION] Error executing ${provider}:`, error.message);
    throw error;
  }
};

// 3. The Compatibility Wrapper (Ensures the worker can call it as an object OR a function)
export const getIntegration = (provider, ...args) => {
  const handler = async (config, credentials = {}) => {
    return await execute(provider, 'default_action', config, credentials);
  };

  // This is the magic line fixing your crash: it gives the worker the exact .execute() method it wants!
  handler.execute = async (action, config, credentials) => {
    return await execute(provider, action, config, credentials);
  };

  if (args.length > 0) {
    return handler(args[0], args[1]);
  }
  
  return handler;
};