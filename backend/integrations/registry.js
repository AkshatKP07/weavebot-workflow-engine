// backend/integrations/registry.js
import _ from 'lodash';

// Example Integration 1: Discord Webhooks / Bot
const discordIntegration = {
  id: 'discord',
  name: 'Discord',
  requiredFields: ['webhookUrl'],
  async execute({ context, nodeData, credential }) {
    const webhookUrl = credential?.data?.webhookUrl || nodeData.webhookUrl;
    if (!webhookUrl) throw new Error("Discord Webhook URL is missing");

    const messageContent = nodeData.message || "No content provided";
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: messageContent })
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.statusText}`);
    }

    return { success: true, status: response.status };
  }
};

// Example Integration 2: Generic Authenticated API / Webhook Action
const apiIntegration = {
  id: 'custom_api',
  name: 'Custom Authenticated API',
  requiredFields: ['endpointUrl', 'apiKey'],
  async execute({ context, nodeData, credential }) {
    const endpoint = nodeData.endpointUrl;
    const apiKey = credential?.data?.apiKey || nodeData.apiKey;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ payload: context })
    });

    const data = await response.json().catch(() => ({ status: 'executed' }));
    return data;
  }
};

const registry = new Map();
registry.set(discordIntegration.id, discordIntegration);
registry.set(apiIntegration.id, apiIntegration);

export function getIntegration(id) {
  return registry.get(id);
}

export function listIntegrations() {
  return Array.from(registry.values()).map(item => ({
    id: item.id,
    name: item.name,
    requiredFields: item.requiredFields
  }));
}