/* =========================================================
   Claude Prompt Forge — popup.js  v1.1
   Dual-provider: Anthropic Claude + NVIDIA NIM
   ========================================================= */

'use strict';

// ---- Model Definitions ----
const MODELS = {
  anthropic: [
    { value: 'claude-opus-4-8',  label: 'Claude Opus 4.8',  desc: 'Most capable' },
    { value: 'claude-sonnet-5',  label: 'Claude Sonnet 5',  desc: 'Balanced · faster' },
    { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', desc: 'Fastest & lightweight' },
  ],
  'nvidia-nim': [
    { value: 'meta/llama-3.3-70b-instruct',              label: 'Llama 3.3 70B',          desc: 'Meta · Best overall' },
    { value: 'nvidia/llama-3.1-nemotron-ultra-253b-v1',  label: 'Nemotron Ultra 253B',     desc: 'NVIDIA · Most capable' },
    { value: 'nvidia/llama-3.1-nemotron-70b-instruct',   label: 'Nemotron 70B',            desc: 'NVIDIA · Balanced' },
    { value: 'mistralai/mistral-large-2-instruct',       label: 'Mistral Large 2',         desc: 'Mistral · Strong reasoning' },
    { value: 'deepseek-ai/deepseek-r1',                  label: 'DeepSeek R1',             desc: 'DeepSeek · Chain-of-thought' },
    { value: 'google/gemma-3-27b-it',                    label: 'Gemma 3 27B',             desc: 'Google · Efficient' },
  ]
};

const MODEL_HINTS = {
  anthropic:    'Keys from console.anthropic.com',
  'nvidia-nim': 'Keys from build.nvidia.com — free tier available'
};

// ---- DOM References ----
const settingsBtn           = document.getElementById('settingsBtn');
const settingsPanel         = document.getElementById('settingsPanel');
const providerAnthropicBtn  = document.getElementById('providerAnthropicBtn');
const providerNimBtn        = document.getElementById('providerNimBtn');
const anthropicKeyGroup     = document.getElementById('anthropicKeyGroup');
const nimKeyGroup           = document.getElementById('nimKeyGroup');
const apiKeyInput           = document.getElementById('apiKeyInput');
const nimApiKeyInput        = document.getElementById('nimApiKeyInput');
const toggleKeyVisBtn       = document.getElementById('toggleKeyVisibility');
const toggleNimKeyVisBtn    = document.getElementById('toggleNimKeyVisibility');
const modelSelect           = document.getElementById('modelSelect');
const modelHint             = document.getElementById('modelHint');
const saveSettingsBtn       = document.getElementById('saveSettingsBtn');
const settingsSavedMsg      = document.getElementById('settingsSavedMsg');

const promptInput           = document.getElementById('promptInput');
const charCount             = document.getElementById('charCount');
const clearPromptBtn        = document.getElementById('clearPromptBtn');
const exampleChips          = document.getElementById('exampleChips');

const forgeBtn              = document.getElementById('forgeBtn');
const forgeBtnText          = document.getElementById('forgeBtnText');
const forgeBtnLoader        = document.getElementById('forgeBtnLoader');

const errorBanner           = document.getElementById('errorBanner');
const errorMessage          = document.getElementById('errorMessage');

const outputSection         = document.getElementById('outputSection');
const jsonFields            = document.getElementById('jsonFields');
const copyBtn               = document.getElementById('copyBtn');
const copyBtnText           = document.getElementById('copyBtnText');
const downloadBtn           = document.getElementById('downloadBtn');
const resetBtn              = document.getElementById('resetBtn');
const rawToggleBtn          = document.getElementById('rawToggleBtn');
const rawJsonPanel          = document.getElementById('rawJsonPanel');
const rawJsonOutput         = document.getElementById('rawJsonOutput');

// ---- State ----
let currentJson     = null;
let settingsOpen    = false;
let rawJsonVisible  = false;
let activeProvider  = 'anthropic'; // 'anthropic' | 'nvidia-nim'

// ---- Field Metadata ----
// Mirrors the "Anatomy of a Perfect Claude Prompt" section order.
const FIELD_META = {
  purpose:            { label: 'Purpose',            icon: '🧭' },
  task:               { label: 'Task',               icon: '🎯' },
  context:            { label: 'Context',            icon: '📋' },
  effort:             { label: 'Effort',             icon: '🧠' },
  boundaries:         { label: 'Boundaries',         icon: '🚧' },
  verification_rules: { label: 'Verification Rules', icon: '✅' },
  stop_conditions:    { label: 'Stop Conditions',    icon: '🛑' },
  output_format:      { label: 'Output Format',      icon: '📄' },
};

// ---- Init ----
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  bindEvents();
});

// ---- Load saved settings ----
async function loadSettings() {
  const data = await chrome.storage.local.get([
    'apiKey',
    'nimApiKey',
    'model',
    'provider',
    'lastPrompt',
    'lastJson',
    'lastJsonProvider',
    'lastJsonModel'
  ]);

  activeProvider = data.provider || 'anthropic';

  if (data.apiKey)    apiKeyInput.value    = data.apiKey;
  if (data.nimApiKey) nimApiKeyInput.value = data.nimApiKey;

  applyProvider(activeProvider, false);

  // Restore saved model or default to first in list
  if (data.model) {
    const opt = modelSelect.querySelector(`option[value="${data.model}"]`);
    if (opt) opt.selected = true;
  }

  // Restore prompt text
  if (data.lastPrompt) {
    promptInput.value = data.lastPrompt;
    const len = data.lastPrompt.length;
    charCount.textContent = `${len} / 2000`;
    clearPromptBtn.classList.toggle('hidden', len === 0);
  }

  // Restore JSON output
  if (data.lastJson) {
    currentJson = data.lastJson;
    const jsonProvider = data.lastJsonProvider || activeProvider;
    const jsonModel = data.lastJsonModel || (data.model || MODELS[jsonProvider][0].value);
    renderOutput(currentJson, jsonProvider, jsonModel);
    outputSection.classList.remove('hidden');
  }
}

// ---- Apply provider state ----
function applyProvider(provider, animate = true) {
  activeProvider = provider;

  // Toggle pills
  providerAnthropicBtn.classList.toggle('active', provider === 'anthropic');
  providerNimBtn.classList.toggle('active', provider === 'nvidia-nim');

  // Toggle key inputs
  anthropicKeyGroup.classList.toggle('hidden', provider !== 'anthropic');
  nimKeyGroup.classList.toggle('hidden', provider !== 'nvidia-nim');

  // Body class for theme shift
  document.body.classList.toggle('nim-active', provider === 'nvidia-nim');

  // Repopulate model dropdown
  populateModels(provider);

  // Update header badge text
  const badge = document.querySelector('.title-badge');
  if (badge) badge.textContent = provider === 'nvidia-nim' ? 'via NIM' : 'for Claude';
}

// ---- Populate model dropdown ----
function populateModels(provider) {
  modelSelect.innerHTML = '';
  const models = MODELS[provider] || [];
  models.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.value;
    opt.textContent = `${m.label} — ${m.desc}`;
    modelSelect.appendChild(opt);
  });
  modelHint.textContent = MODEL_HINTS[provider] || '';
}

// ---- Bind all events ----
function bindEvents() {
  // Settings toggle
  settingsBtn.addEventListener('click', () => {
    settingsOpen = !settingsOpen;
    settingsPanel.classList.toggle('hidden', !settingsOpen);
  });

  // Provider toggle buttons
  providerAnthropicBtn.addEventListener('click', () => applyProvider('anthropic'));
  providerNimBtn.addEventListener('click', () => applyProvider('nvidia-nim'));

  // Key visibility toggles
  bindKeyToggle(toggleKeyVisBtn, apiKeyInput);
  bindKeyToggle(toggleNimKeyVisBtn, nimApiKeyInput);

  // Save settings
  saveSettingsBtn.addEventListener('click', saveSettings);

  // Prompt textarea
  promptInput.addEventListener('input', () => {
    const len = promptInput.value.length;
    charCount.textContent = `${len} / 2000`;
    clearPromptBtn.classList.toggle('hidden', len === 0);
    hideError();
    chrome.storage.local.set({ lastPrompt: promptInput.value });
  });

  // Clear prompt
  clearPromptBtn.addEventListener('click', () => {
    promptInput.value = '';
    charCount.textContent = '0 / 2000';
    clearPromptBtn.classList.add('hidden');
    promptInput.focus();
    hideError();
    chrome.storage.local.set({ lastPrompt: '' });
  });

  // Example chips
  exampleChips.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const p = chip.dataset.prompt;
    promptInput.value = p;
    charCount.textContent = `${p.length} / 2000`;
    clearPromptBtn.classList.remove('hidden');
    hideError();
    promptInput.focus();
    chrome.storage.local.set({ lastPrompt: p });
  });

  // Forge
  forgeBtn.addEventListener('click', handleForge);
  promptInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handleForge(); }
  });

  // Output actions
  copyBtn.addEventListener('click', handleCopy);
  downloadBtn.addEventListener('click', handleDownload);
  resetBtn.addEventListener('click', handleReset);
  rawToggleBtn.addEventListener('click', handleRawToggle);
}

// ---- Key visibility toggle helper ----
function bindKeyToggle(btn, input) {
  const eyeOpen  = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const eyeClosed = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
  btn.addEventListener('click', () => {
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    btn.innerHTML = isPassword ? eyeClosed : eyeOpen;
  });
}

// ---- Save Settings ----
async function saveSettings() {
  const anthropicKey = apiKeyInput.value.trim();
  const nimKey       = nimApiKeyInput.value.trim();
  const model        = modelSelect.value;

  // Validate keys if provided
  if (anthropicKey && !anthropicKey.startsWith('sk-ant-')) {
    showError('Anthropic key format looks wrong — it should start with "sk-ant-".');
    return;
  }
  if (nimKey && !nimKey.startsWith('nvapi-')) {
    showError('NVIDIA NIM key format looks wrong — it should start with "nvapi-".');
    return;
  }

  await chrome.storage.local.set({
    apiKey:    anthropicKey,
    nimApiKey: nimKey,
    model,
    provider:  activeProvider
  });

  settingsSavedMsg.classList.remove('hidden');
  setTimeout(() => settingsSavedMsg.classList.add('hidden'), 2500);
}

// ---- Forge ----
async function handleForge() {
  const prompt = promptInput.value.trim();

  if (!prompt)          { showError('Please enter a prompt first.'); return; }
  if (prompt.length < 5){ showError('Prompt is too short — add a bit more detail.'); return; }

  const data = await chrome.storage.local.get(['apiKey', 'nimApiKey', 'model', 'provider']);
  const provider = data.provider || 'anthropic';
  const apiKey   = provider === 'nvidia-nim' ? data.nimApiKey : data.apiKey;

  // Saved model may be stale (e.g. a retired model ID) — fall back to the current default
  const knownModels = MODELS[provider] || [];
  const model = knownModels.some(m => m.value === data.model)
    ? data.model
    : knownModels[0].value;

  if (!apiKey) {
    const name = provider === 'nvidia-nim' ? 'NVIDIA NIM' : 'Anthropic';
    showError(`No ${name} API key found. Click ⚙ to add your key.`);
    settingsOpen = true;
    settingsPanel.classList.remove('hidden');
    return;
  }

  setForging(true);
  hideError();

  try {
    const response = await chrome.runtime.sendMessage({
      type:     'FORGE_PROMPT',
      prompt,
      apiKey,
      model,
      provider
    });

    if (!response.success) throw new Error(response.error || 'Unknown API error.');

    currentJson = response.data;
    renderOutput(currentJson, provider, model);
    outputSection.classList.remove('hidden');
    outputSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Persist the forged state along with the prompt
    await chrome.storage.local.set({
      lastPrompt: promptInput.value,
      lastJson: currentJson,
      lastJsonProvider: provider,
      lastJsonModel: model
    });

  } catch (err) {
    showError(err.message);
  } finally {
    setForging(false);
  }
}

function setForging(active) {
  forgeBtn.disabled = active;
  forgeBtnText.classList.toggle('hidden', active);
  forgeBtnLoader.classList.toggle('hidden', !active);
}

// ---- Render Output ----
function renderOutput(json, provider, modelValue) {
  jsonFields.innerHTML = '';
  rawJsonOutput.textContent = JSON.stringify(json, null, 2);
  rawJsonVisible = false;
  rawJsonPanel.classList.add('hidden');
  updateRawToggleLabel(false);

  // Provider source label
  const providerLabel = provider === 'nvidia-nim'
    ? `NVIDIA NIM · ${getModelLabel(modelValue, provider)}`
    : `Anthropic · ${getModelLabel(modelValue, provider)}`;

  const sourceEl = document.createElement('div');
  sourceEl.className = 'provider-source';
  sourceEl.innerHTML = `<span class="provider-source-dot"></span><span>Generated via ${escapeHtml(providerLabel)}</span>`;
  jsonFields.appendChild(sourceEl);

  // Field cards
  const orderedKeys = Object.keys(FIELD_META).filter(k => json[k] !== undefined);
  const extraKeys   = Object.keys(json).filter(k => !FIELD_META[k]);

  [...orderedKeys, ...extraKeys].forEach((key, i) => {
    const card = buildJsonCard(key, json[key], FIELD_META[key] || { label: key, icon: '•' }, i);
    jsonFields.appendChild(card);
  });
}

function getModelLabel(modelValue, provider) {
  const m = (MODELS[provider] || []).find(x => x.value === modelValue);
  return m ? m.label : modelValue || 'Unknown model';
}

function buildJsonCard(key, value, meta, index) {
  const card = document.createElement('div');
  card.className = 'json-card';
  card.style.animationDelay = `${index * 40}ms`;

  const isArray  = Array.isArray(value);
  const typeLabel = isArray ? `array[${value.length}]` : typeof value;

  card.innerHTML = `
    <div class="json-card-header">
      <span class="json-card-key">${meta.icon ? meta.icon + ' ' : ''}${meta.label}</span>
      <span class="json-field-type">${typeLabel}</span>
    </div>
    <div class="json-card-value ${isArray ? 'is-array' : ''}">
      ${isArray
        ? value.map(item => `<div class="array-item"><span class="array-bullet">▸</span><span>${escapeHtml(String(item))}</span></div>`).join('')
        : `<span>${escapeHtml(String(value))}</span>`
      }
    </div>
  `;
  return card;
}

// ---- Assemble paste-ready Claude prompt ----
// Sections become plain paragraphs in anatomy order; arrays become one sentence per line.
function assemblePrompt(json) {
  const orderedKeys = Object.keys(FIELD_META).filter(k => json[k] !== undefined);
  const extraKeys   = Object.keys(json).filter(k => !FIELD_META[k]);
  return [...orderedKeys, ...extraKeys]
    .map(key => {
      const value = json[key];
      return Array.isArray(value) ? value.map(String).join('\n') : String(value);
    })
    .filter(block => block.trim().length > 0)
    .join('\n\n');
}

// ---- Copy ----
async function handleCopy() {
  if (!currentJson) return;
  const text = assemblePrompt(currentJson);
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = Object.assign(document.createElement('textarea'), {
      value: text, style: 'position:fixed;opacity:0'
    });
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
  copyBtn.classList.add('copied');
  copyBtnText.textContent = 'Copied!';
  setTimeout(() => { copyBtn.classList.remove('copied'); copyBtnText.textContent = 'Copy'; }, 2000);
}

// ---- Download ----
function handleDownload() {
  if (!currentJson) return;
  const blob = new Blob([JSON.stringify(currentJson, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: `forge-${Date.now()}.json` }).click();
  URL.revokeObjectURL(url);
}

// ---- Reset ----
function handleReset() {
  outputSection.classList.add('hidden');
  jsonFields.innerHTML = '';
  rawJsonOutput.textContent = '';
  currentJson = null;
  rawJsonVisible = false;
  rawJsonPanel.classList.add('hidden');
  updateRawToggleLabel(false);
  promptInput.value = '';
  charCount.textContent = '0 / 2000';
  clearPromptBtn.classList.add('hidden');
  hideError();
  promptInput.focus();
  chrome.storage.local.remove(['lastPrompt', 'lastJson', 'lastJsonProvider', 'lastJsonModel']);
}

// ---- Raw JSON Toggle ----
function handleRawToggle() {
  rawJsonVisible = !rawJsonVisible;
  rawJsonPanel.classList.toggle('hidden', !rawJsonVisible);
  updateRawToggleLabel(rawJsonVisible);
}

function updateRawToggleLabel(visible) {
  const codeIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`;
  rawToggleBtn.innerHTML = `${codeIcon} ${visible ? 'Hide' : 'View'} Raw JSON`;
}

// ---- Error ----
function showError(msg) { errorMessage.textContent = msg; errorBanner.classList.remove('hidden'); }
function hideError()    { errorBanner.classList.add('hidden'); errorMessage.textContent = ''; }

// ---- Util ----
function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
