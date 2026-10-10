// src/api/client.js

// 1. Get the URL from .env, fallback to localhost
let BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// 2. Strip any accidental trailing slashes (e.g. "http://localhost:3001/")
BASE_URL = BASE_URL.replace(/\/+$/, '');

// 3. Force the /api suffix if it is missing
const API_URL = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;

// Helper function to automatically attach the Clerk JWT token
async function fetchWithAuth(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  
  // Grab the active session token directly from Clerk
  if (window.Clerk?.session) {
    const token = await window.Clerk.session.getToken();
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Ensure endpoint starts with a slash
  const safeEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const response = await fetch(`${API_URL}${safeEndpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API Error: ${response.statusText}`);
  }
  return response.json();
}

export const apiClient = {
  // --- WORKFLOWS ---
  getWorkflows: () => fetchWithAuth('/workflows'),
  listWorkflows: () => fetchWithAuth('/workflows'), // Alias added for the Saved Workflows modal
  saveWorkflow: (data) => fetchWithAuth('/workflows', { method: 'POST', body: JSON.stringify(data) }),
  deleteWorkflow: (id) => fetchWithAuth(`/workflows/${id}`, { method: 'DELETE' }), // Added delete function
  bulkDeployWorkflows: (workflowIds) => fetchWithAuth('/workflows/bulk-deploy', { method: 'POST', body: JSON.stringify({ workflowIds }) }),
  bulkUndeployWorkflows: (workflowIds) => fetchWithAuth('/workflows/bulk-undeploy', { method: 'POST', body: JSON.stringify({ workflowIds }) }),
  
  // --- MARKETPLACE ---
  // Updated to support pagination matching the backend updates
  getTemplates: (page = 1, limit = 20) => fetchWithAuth(`/templates?page=${page}&limit=${limit}`),
  publishTemplate: (workflowId) => fetchWithAuth(`/templates/publish/${workflowId}`, { method: 'POST' }),
  useTemplate: (templateId) => fetchWithAuth(`/templates/use/${templateId}`, { method: 'POST' }),
  deleteTemplate: (templateId) => fetchWithAuth(`/templates/${templateId}`, { method: 'DELETE' }),

  // Add these inside your apiClient object
  testWorkflow: (id, payload) => fetchWithAuth(`/workflows/${id}/test`, { 
    method: 'POST', 
    body: JSON.stringify({ payload }) 
  }),
  getExecutions: (id) => fetchWithAuth(`/workflows/${id}/executions`),

  // --- CREDENTIALS & INTEGRATIONS ---
  getIntegrations: () => fetchWithAuth('/integrations'),
  getCredentials: () => fetchWithAuth('/credentials'),
  saveCredential: (provider, data) => fetchWithAuth('/credentials', { 
    method: 'POST', 
    body: JSON.stringify({ provider, data }) 
  })
};