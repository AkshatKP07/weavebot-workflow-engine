// backend/utils/templateEngine.js

// 1. Scrub sensitive data from a workflow before publishing it publicly
export function sanitizeGraphForTemplate(graph) {
  const sanitizedGraph = JSON.parse(JSON.stringify(graph)); // Deep clone

  sanitizedGraph.nodes = sanitizedGraph.nodes.map(node => {
    const cleanNode = { ...node };
    
    if (cleanNode.type === 'trigger') {
      cleanNode.data.label = '/webhook/your-endpoint-here';
    }
    
    if (cleanNode.type === 'integration') {
      // Remove user-specific connection details, keep the provider
      delete cleanNode.data.webhookUrl;
      delete cleanNode.data.endpointUrl;
      delete cleanNode.data.apiKey;
    }

    if (cleanNode.type === 'knowledge_base') {
      delete cleanNode.data.databaseId;
      cleanNode.data.label = 'Select your database';
    }

    return cleanNode;
  });

  return sanitizedGraph;
}

// 2. Clone a template for a new user and map all the edges to new IDs
export function instantiateTemplateGraph(graph) {
  const newGraph = JSON.parse(JSON.stringify(graph));
  const idMap = {};

  // Generate new IDs for every node and keep track of the mapping
  newGraph.nodes = newGraph.nodes.map(node => {
    const oldId = node.id;
    const newId = `node-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    idMap[oldId] = newId;
    
    return { ...node, id: newId };
  });

  // Update edges to use the brand new Node IDs
  newGraph.edges = newGraph.edges.map(edge => {
    return {
      ...edge,
      id: `edge-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      source: idMap[edge.source] || edge.source,
      target: idMap[edge.target] || edge.target
    };
  });

  return newGraph;
}