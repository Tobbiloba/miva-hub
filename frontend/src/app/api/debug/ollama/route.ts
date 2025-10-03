// Helper function to construct Ollama API URL (same as in models.ts)
function getOllamaApiUrl(endpoint: string = ''): string {
  const baseURL = process.env.OLLAMA_BASE_URL || "http://localhost:11434/api";
  // Remove /api from the end if it exists to avoid double /api
  const cleanBaseURL = baseURL.replace(/\/api\/?$/, '');
  return `${cleanBaseURL}/api${endpoint}`;
}

export async function GET() {
  try {
    console.log('Testing Ollama connection...');
    const url = getOllamaApiUrl('/tags');
    console.log('Ollama URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });

    console.log('Ollama response status:', response.status, response.statusText);
    
    if (!response.ok) {
      return Response.json({ 
        success: false, 
        error: `HTTP ${response.status}: ${response.statusText}`,
        url,
        env: process.env.OLLAMA_BASE_URL || 'not set'
      });
    }

    const data = await response.json();
    console.log('Ollama models found:', data.models?.length || 0);
    
    return Response.json({ 
      success: true, 
      modelsCount: data.models?.length || 0,
      models: data.models?.map((m: any) => m.name) || [],
      url,
      env: process.env.OLLAMA_BASE_URL || 'not set'
    });
  } catch (error: any) {
    console.error('Ollama connection failed:', error);
    return Response.json({ 
      success: false, 
      error: error.message,
      url: getOllamaApiUrl('/tags'),
      env: process.env.OLLAMA_BASE_URL || 'not set'
    });
  }
}