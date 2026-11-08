// Locus — Qianwen (Qwen) vision: settings + screenshot analysis
// Calls the OpenAI-compatible endpoint straight from the browser.
// The API key is kept only in this browser's localStorage.

window.LocusAI = (() => {
  const KEY = 'locus.settings';
  const PAYG_BASE = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  const DEFAULTS = { apiKey: '', model: 'qwen3.8-flash', baseUrl: '', preferences: '' };

  const MODELS = [
    { id: 'qwen3.8-flash', note: 'Fast & cheap · recommended' },
    { id: 'qwen3.8-max', note: 'Strongest · slower, pricier' },
    { id: 'qwen3.7-plus', note: 'Balanced' },
    { id: 'qwen3-vl-flash', note: 'Lowest latency' },
  ];

  function load() {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
    catch (e) { return { ...DEFAULTS }; }
  }
  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }
  const isReady = () => !!load().apiKey.trim();
  // Token Plan keys (sk-sp-…) use an endpoint that refuses browser calls.
  const isTokenPlanKey = (k) => /^sk-sp-/.test((k || '').trim());

  async function chat(body, settings = load(), options = {}) {
    const key = settings.apiKey.trim();
    if (!key) throw new Error('Add your Qianwen API key in Settings first.');
    const base = (settings.baseUrl || PAYG_BASE).replace(/\/+$/, '');
    let res;
    try {
      res = await fetch(`${base}/chat/completions`, {
        method: 'POST', signal: options.signal,
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: settings.model, ...body }),
      });
    } catch (e) {
      if(options.signal?.aborted) throw new Error('Request timed out or was stopped. You can retry.');
      throw new Error('Could not reach Qianwen. Check your network connection.');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.error?.message || data.message || `HTTP ${res.status}`;
      if (res.status === 401) throw new Error('API key was rejected (401). Check it in Settings.');
      throw new Error(msg);
    }
    return data.choices?.[0]?.message?.content || '';
  }

  // Tiny request to confirm the key + model work. Costs a handful of tokens.
  async function test(settings) {
    const out = await chat({ messages: [{ role: 'user', content: 'Reply with: ok' }], max_tokens: 5, enable_thinking: false }, settings);
    return out.trim() || 'ok';
  }

  function parseJson(text) {
    try { return JSON.parse(text); } catch (e) {}
    const m = text.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch (e) {} }
    throw new Error('Qianwen returned something that was not JSON.');
  }

  // Read one screenshot. Returns { title, summary, tags, collection, isNew, confidence, source, emoji, text }.
  async function analyzeScreenshot(dataUrl, collections, options = {}) {
    const names = collections.map((c) => `- ${c.name}${c.vibe ? ` (${c.vibe})` : ''}`).join('\n');
    const preferences = String(load().preferences || '').trim();
    const system =
`You organize a person's saved screenshots into collections.
Look at the screenshot and return ONLY a JSON object with these fields:
- "title": short name of the thing saved (max 8 words and 60 characters)
- "summary": 1-3 sentences on what it is and why it might be worth keeping
- "tags": 3-5 short lowercase keywords
- "text": the most important line of text visible in the screenshot (max 200 chars, verbatim if possible, "" if none)
- "source": the app or site it came from if recognizable (e.g. Xiaohongshu, WeChat, Instagram, Twitter, Taobao), else ""
- "emoji": one emoji that represents it
- "collection": the best matching collection name, copied EXACTLY from the list below; if none fits well, invent a short new collection name (2-3 words)
- "is_new_collection": true only if you invented a new name
- "confidence": 0-100, how sure you are about the collection
Write title, summary, tags and new collection names in the same language as the screenshot's main text.

Existing collections:
${names || '(none yet)'}` + (preferences ? `\n\nOrganization preferences:\n${preferences}\nFollow these preferences while keeping the required JSON fields, title length, and factual accuracy. Do not invent information absent from the image.` : '');

    const content = await chat({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: [
          { type: 'image_url', image_url: { url: dataUrl } },
          { type: 'text', text: 'Organize this screenshot.' },
        ] },
      ],
      enable_thinking: false,
      response_format: { type: 'json_object' },
      max_tokens: 700,
    }, load(), options);
    const r = parseJson(content);
    const match = collections.find((c) => c.name.toLowerCase() === String(r.collection || '').trim().toLowerCase());
    return {
      title: window.LocusTheme.shortTitle(String(r.title || 'Untitled capture')),
      summary: String(r.summary || ''),
      tags: (Array.isArray(r.tags) ? r.tags : []).map(String).slice(0, 6),
      text: String(r.text || ''),
      source: String(r.source || ''),
      emoji: String(r.emoji || '◌').slice(0, 4),
      collection: match ? match.name : String(r.collection || 'Unsorted').trim(),
      isNew: !match,
      confidence: Math.max(0, Math.min(100, Math.round(Number(r.confidence) || 0))),
    };
  }

  return { load, save, isReady, isTokenPlanKey, test, analyzeScreenshot, MODELS, PAYG_BASE };
})();
