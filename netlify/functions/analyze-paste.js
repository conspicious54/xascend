/**
 * Netlify serverless function: paste timeline analysis (Claude).
 * Set ANTHROPIC_API_KEY in Netlify env.
 */

function splitPastedTimelineIntoPosts(rawText) {
  let blocks = rawText
    .split(/\n\s*(?=@[\w]{1,30}\b)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (blocks.length <= 1) {
    blocks = rawText
      .split(/\n\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  if (blocks.length <= 1 && rawText.includes('\n')) {
    const dateOrAt = /\n\s*(?=(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}|\d{1,2}\s*(?:\/|\.)\s*\d{1,2}|@[\w]+)/i;
    blocks = rawText.split(dateOrAt).map((s) => s.trim()).filter((s) => s.length > 0);
  }
  return blocks.filter((b) => {
    if (b.length < 3) return false;
    const lower = b.toLowerCase();
    if (lower === 'image' || lower === 'video') return false;
    return true;
  });
}

async function runAnalysis(rawText) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { error: 'ANTHROPIC_API_KEY not set' };

  const blocks = splitPastedTimelineIntoPosts(rawText);
  if (blocks.length === 0) {
    return { error: 'No posts found. Paste your timeline—we detect tweets by @username or new dates.' };
  }

  const tweetTexts = blocks.map((t, idx) => `[${idx}] ${t}`).join('\n\n');
  const prompt = `You are discovering emerging software, books, and ideas from what people are actually saying—NOT matching against any predefined list or database.

Read each post and infer from CONTEXT what is being talked about. Extract only what is clearly implied or stated:
1. SOFTWARE/TOOLS - Apps, SaaS, AI tools, or software mentioned or recommended
2. BOOKS - Books referenced or recommended
3. IDEAS - Concepts, frameworks, methodologies, or mental models discussed

We want things people are just starting to talk about or that are emerging. Prefer specific names/titles from the post. Do not add items from your own knowledge that are not actually mentioned or strongly implied.

IMPORTANT: For each item, include "post_indices": an array of the post numbers [0], [1], [2]... where that item was mentioned. Use the exact index from each post header above.

For each item found, provide:
- name (exact or clearly implied)
- type: "software" | "book" | "idea"
- context: one sentence on how it was mentioned
- sentiment: "positive" | "neutral" | "critical"
- post_indices: array of post indices where this item appeared (e.g. [0, 3, 7])

Posts:
${tweetTexts}

Return ONLY valid JSON:
{
  "items": [
    { "name": "...", "type": "software" | "book" | "idea", "context": "...", "sentiment": "...", "post_indices": [0, 2, 5] }
  ]
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return { error: `Claude API error: ${err}` };
  }

  const data = await response.json();
  const content = data.content?.[0]?.text || '';
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { error: 'Could not parse AI response' };

  const parsed = JSON.parse(jsonMatch[0]);
  const rawItems = parsed.items || [];

  const byKey = new Map();
  for (const item of rawItems) {
    const name = item.name?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const indices = Array.isArray(item.post_indices) ? item.post_indices : [];

    if (!byKey.has(key)) {
      byKey.set(key, {
        name,
        type: item.type || 'idea',
        context: item.context,
        sentiment: item.sentiment || 'neutral',
        mention_count: new Set(indices).size,
        _indices: new Set(indices),
      });
    } else {
      const existing = byKey.get(key);
      for (const i of indices) existing._indices.add(i);
      existing.mention_count = existing._indices.size;
      if (item.context && existing.context !== item.context) {
        existing.context = [existing.context, item.context].filter(Boolean).join(' · ');
      }
    }
  }

  const items = Array.from(byKey.values())
    .map(({ _indices, ...rest }) => rest)
    .sort((a, b) => (b.mention_count || 0) - (a.mention_count || 0));

  return { items };
}

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const text = body?.text;
  if (!text || typeof text !== 'string') {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'text (string) required' }) };
  }

  try {
    const result = await runAnalysis(text);
    if (result.error) {
      return { statusCode: 400, headers, body: JSON.stringify(result) };
    }
    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Analysis failed' }),
    };
  }
};
