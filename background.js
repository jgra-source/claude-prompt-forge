// Claude Prompt Forge — Background Service Worker v1.1
// Supports: Anthropic Claude API + NVIDIA NIM API (OpenAI-compatible)

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FORGE_PROMPT') {
    forgePrompt(message.prompt, message.apiKey, message.model, message.provider)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(err  => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  }
});

// ---- System prompt shared by both providers ----
// Follows the "Anatomy of a Perfect Claude Prompt" structure:
// Purpose → Task → Context → Effort → Boundaries → Verification Rules → Stop Conditions → Output Format
const SYSTEM_PROMPT = `You are a prompt engineering expert specializing in prompts for Anthropic's Claude models. Your job is to analyze a user's natural language request and expand it into a structured, Claude-optimized prompt.

Claude responds best to prompts written in short, plain, direct sentences — imperative voice, no filler, no headers, no markdown. Each section is a small block of 2-4 sentences that can be pasted into Claude as-is.

Produce a JSON object with EXACTLY these fields, in this order:

- "purpose": Why this prompt exists. State the situation, the goal, and what the output should enable the user to do. (string, 2-4 short sentences)
- "task": The direct instruction. A precise, action-oriented description of the deliverable Claude must produce, with concrete scope (quantity, timeframe, components). (string, 2-4 short sentences)
- "context": The concrete facts Claude needs: product/subject, people involved, resources available, constraints, and known risks. Only facts stated or safely inferable from the user's request — never invent specifics. (string, 2-4 short sentences)
- "effort": How much thinking effort Claude should apply and where to focus it (e.g. "Use high effort for this task. Focus on deep thinking, clear steps, and careful checks. Do not spend time on ideas that do not help the goal."). (string, 2-3 short sentences)
- "boundaries": What Claude should and should not do: act when it has enough information, no extra features or frameworks the user did not ask for, keep the output focused and useful. (array of 3-4 short imperative sentences)
- "verification_rules": Checks Claude must run before giving the final answer: every claim ties back to the stated goal or a stated risk, unproven statements are labeled as assumptions, no invented numbers, feedback, or results. (array of 3-4 short imperative sentences)
- "stop_conditions": Measurable completion criteria — what must be true before Claude stops (e.g. required counts, required attributes per item, a required closing element). (array of 3-4 short sentences)
- "output_format": Exactly how to present the response: structure, fields per item, and readability requirements. (string, 2-4 short sentences)

Rules:
- Write every section addressed TO Claude, in second person imperative ("Build...", "Do not...", "Only stop when...").
- Keep sentences short and plain. No markdown, no bullets inside strings, no section headers inside values.
- Ground everything in the user's actual request. Where the request is vague, make reasonable generic choices rather than inventing specific facts, numbers, or names.

Return ONLY valid JSON. No markdown fences, no commentary, no explanation. Pure JSON object.`;

// ---- Main dispatch ----
async function forgePrompt(userPrompt, apiKey, model, provider) {
  if (provider === 'nvidia-nim') {
    return await callNvidiaAPI(userPrompt, apiKey, model);
  }
  return await callAnthropicAPI(userPrompt, apiKey, model);
}

// ---- Anthropic API ----
async function callAnthropicAPI(userPrompt, apiKey, model) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: model || 'claude-opus-4-8',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: `Transform this request into a Claude-optimized structured prompt (JSON):\n\n"${userPrompt}"` }
      ]
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Anthropic API error ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  return parseJsonFromText(data.content?.[0]?.text || '');
}

// ---- NVIDIA NIM API (OpenAI-compatible) ----
async function callNvidiaAPI(userPrompt, apiKey, model) {
  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || 'meta/llama-3.3-70b-instruct',
      max_tokens: 2000,
      temperature: 0.3,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: `Transform this request into a Claude-optimized structured prompt (JSON):\n\n"${userPrompt}"` }
      ]
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const detail = errData?.detail || errData?.message || errData?.error?.message;
    throw new Error(detail || `NVIDIA NIM API error ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  return parseJsonFromText(data.choices?.[0]?.message?.content || '');
}

// ---- Shared JSON extractor ----
function parseJsonFromText(raw) {
  if (!raw) throw new Error('Empty response from API. Please try again.');

  // Strip markdown fences if model wraps output
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // Try direct parse
  try {
    return JSON.parse(cleaned);
  } catch (_) { /* fall through */ }

  // Try extracting first {...} block
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch (_) { /* fall through */ }
  }

  throw new Error('Could not parse JSON from model response. Try a more descriptive prompt.');
}
