import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const [localEnv, exampleEnv] = await Promise.all([
  readFile(new URL('./.env.local', import.meta.url), 'utf8').catch(() => ''),
  readFile(new URL('./.env.example', import.meta.url), 'utf8').catch(() => ''),
]);
const envKey = (text) => text.match(/^MESHY_API_KEY\s*=\s*["']?([^\s"']+)["']?\s*$/m)?.[1];
const MESHY_API_KEYS = [...new Set([process.env.MESHY_API_KEY, envKey(localEnv), envKey(exampleEnv)].filter(Boolean))];
const MESHY_URL = 'https://api.meshy.ai/openapi/v2/text-to-3d';

function send(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  let raw = '';
  for await (const chunk of request) raw += chunk;
  return JSON.parse(raw || '{}');
}

async function meshy(path = '', options = {}) {
  let last;
  for (const key of MESHY_API_KEYS) {
    const response = await fetch(`${MESHY_URL}${path}`, {
      ...options,
      headers: { Authorization: `Bearer ${key}`, ...(options.headers || {}) },
    });
    const body = await response.json().catch(() => ({}));
    last = { response, body };
    if (response.status !== 401) return last;
  }
  return last;
}

function taskResponse(task) {
  return {
    taskId: task.id,
    type: task.type,
    status: task.status,
    progress: task.progress,
    thumbnailUrl: task.thumbnail_url,
    glbUrl: task.model_urls?.glb,
    error: task.task_error?.message || undefined,
  };
}

createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  if (!MESHY_API_KEYS.length) return send(response, 500, { error: 'Meshy is not configured on the server.' });

  try {
    if (request.method === 'GET' && url.pathname.startsWith('/api/meshy/task/')) {
      const taskId = url.pathname.split('/').pop();
      const { response: meshyResponse, body } = await meshy(`/${taskId}`);
      if (!meshyResponse.ok) return send(response, meshyResponse.status, { error: body.message || 'Meshy could not retrieve this task.' });
      return send(response, 200, taskResponse(body));
    }

    if (request.method === 'POST' && url.pathname === '/api/meshy/preview') {
      const { description, archetype = 'founder companion', palette = 'midnight blue, orchid, and electric lime' } = await readJson(request);
      if (!description || description.length > 1600) return send(response, 400, { error: 'Please provide a short creature brief.' });
      const prompt = (`Original premium stylized 3D creature, ${archetype}. ${description.slice(0, 420)}. ` +
        `Art direction: sophisticated collectible creature for an ambitious founder network; expressive face, large glassy intelligent eyes, organic asymmetrical silhouette, visible hands or wings, believable anatomy, rounded sculpted forms, tactile matte clay and satin finish, ${palette}. ` +
        `Single full-body character in a relaxed expressive standing pose, centered, clean neutral studio background, no words, no letters, no logos, no weapons, no copyrighted characters, not based on any existing game character.`).slice(0, 600);
      const { response: meshyResponse, body } = await meshy('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'preview', prompt, model_type: 'standard', ai_model: 'latest', target_formats: ['glb'], should_remesh: true, target_polycount: 30000 }),
      });
      if (!meshyResponse.ok) return send(response, meshyResponse.status, { error: body.message || 'Meshy could not start this character.' });
      return send(response, 202, { taskId: body.result, status: 'PENDING' });
    }

    if (request.method === 'POST' && url.pathname === '/api/meshy/refine') {
      const { previewTaskId, texturePrompt } = await readJson(request);
      if (!previewTaskId) return send(response, 400, { error: 'A completed preview task is required.' });
      const { response: meshyResponse, body } = await meshy('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'refine', preview_task_id: previewTaskId, target_formats: ['glb'], auto_size: true, enable_pbr: true, texture_resolution: '2k', texture_prompt: (texturePrompt || 'Premium art-toy creature with tactile clay surface, satin details, expressive eyes, subtle iridescent accents, high-end game character render.').slice(0, 600) }),
      });
      if (!meshyResponse.ok) return send(response, meshyResponse.status, { error: body.message || 'Meshy could not refine this character.' });
      return send(response, 202, { taskId: body.result, status: 'PENDING' });
    }

    send(response, 404, { error: 'Not found' });
  } catch (error) {
    send(response, 400, { error: error.message || 'Could not complete the Meshy request.' });
  }
}).listen(3001, '127.0.0.1', () => console.log('Wildlings API running on http://127.0.0.1:3001'));
