import { createApi } from './api.js';

const bridge = window.AstrBotPluginPage;
let api = null;
const form = document.getElementById('settingsForm');
const statusBox = document.getElementById('status');
const saveBtn = document.getElementById('saveBtn');
const reloadBtn = document.getElementById('reloadBtn');
let schema = {};
let config = {};

function setStatus(text, type = '') {
  statusBox.textContent = text;
  statusBox.className = `status ${type}`.trim();
}

function listToText(value) {
  return Array.isArray(value) ? value.join('\n') : (value ?? '');
}

function render() {
  form.innerHTML = '';
  Object.entries(schema).forEach(([key, item]) => {
    const field = document.createElement('section');
    field.className = 'field';
    const head = document.createElement('div');
    head.className = 'field-head';
    const titleWrap = document.createElement('div');
    titleWrap.innerHTML = `<div class="title">${item.description || key}</div><p class="hint">${item.hint || key}</p>`;
    head.appendChild(titleWrap);
    if (item.type === 'bool') {
      const label = document.createElement('label');
      label.className = 'switch';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.dataset.key = key;
      input.checked = Boolean(config[key]);
      label.appendChild(input);
      head.appendChild(label);
      field.appendChild(head);
    } else if (item.type === 'list') {
      field.appendChild(head);
      const textarea = document.createElement('textarea');
      textarea.dataset.key = key;
      textarea.placeholder = '一行一个，或用英文逗号分隔';
      textarea.value = listToText(config[key]);
      field.appendChild(textarea);
    } else {
      field.appendChild(head);
      const textarea = document.createElement('textarea');
      textarea.dataset.key = key;
      textarea.value = config[key] ?? '';
      field.appendChild(textarea);
    }
    form.appendChild(field);
  });
}

function collectConfig() {
  const result = {};
  Object.entries(schema).forEach(([key, item]) => {
    const el = form.querySelector(`[data-key="${key}"]`);
    if (!el) return;
    if (item.type === 'bool') result[key] = el.checked;
    else if (item.type === 'list') result[key] = el.value.split(/[\n,]/).map(x => x.trim()).filter(Boolean);
    else result[key] = el.value;
  });
  return result;
}

async function load() {
  setStatus('正在加载...');
  if (!api) api = createApi(bridge);
  const data = await api.safeGet('settings/bootstrap');
  schema = data.schema || {};
  config = data.config || {};
  render();
  setStatus('已加载当前配置', 'ok');
}

async function save() {
  saveBtn.disabled = true;
  try {
    setStatus('正在保存...');
    if (!api) api = createApi(bridge);
    config = await api.safePost('settings/config', { config: collectConfig() });
    render();
    setStatus('保存成功。建议重载插件让所有运行时规则立即刷新。', 'ok');
  } catch (err) {
    setStatus(`保存失败：${err.message}`, 'err');
  } finally {
    saveBtn.disabled = false;
  }
}

saveBtn.addEventListener('click', save);
reloadBtn.addEventListener('click', () => load().catch(err => setStatus(`加载失败：${err.message}`, 'err')));
load().catch(err => setStatus(`加载失败：${err.message}`, 'err'));
