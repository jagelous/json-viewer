(function () {
  'use strict';

  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const urlInput = document.getElementById('urlInput');
  const loadUrlBtn = document.getElementById('loadUrlBtn');
  const viewerSection = document.getElementById('viewerSection');
  const welcomeSection = document.getElementById('welcomeSection');
  const treeContainer = document.getElementById('treeContainer');
  const searchInput = document.getElementById('searchInput');
  const expandAllBtn = document.getElementById('expandAllBtn');
  const collapseAllBtn = document.getElementById('collapseAllBtn');
  const copyJsonBtn = document.getElementById('copyJsonBtn');
  const fileNameEl = document.getElementById('fileName');
  const statusEl = document.getElementById('status');
  const toast = document.getElementById('toast');

  let currentData = null;
  let currentFileName = '';

  // ----- Toast -----
  function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = 'toast show ' + type;
    clearTimeout(toast._tid);
    toast._tid = setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  }

  // ----- Load JSON from text -----
  function parseJson(text) {
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error('Invalid JSON: ' + (e.message || 'parse error'));
    }
  }

  // ----- Load from file -----
  function loadFromFile(file) {
    if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
      showToast('Please choose a .json file.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = parseJson(e.target.result);
        setData(data, file.name);
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
    reader.onerror = () => showToast('Failed to read file.', 'error');
    reader.readAsText(file, 'UTF-8');
  }

  // ----- Load from URL -----
  async function loadFromUrl() {
    const url = (urlInput.value || '').trim();
    if (!url) {
      showToast('Enter a URL first.', 'error');
      return;
    }
    loadUrlBtn.disabled = true;
    loadUrlBtn.textContent = 'Loading…';
    try {
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();
      const data = parseJson(text);
      const name = url.replace(/^.*\//, '').replace(/\?.*$/, '') || 'response.json';
      setData(data, name);
      showToast('Loaded from URL.');
    } catch (err) {
      const msg = err.message || 'Failed to load URL. Check CORS if the URL is on another domain.';
      showToast(msg, 'error');
    } finally {
      loadUrlBtn.disabled = false;
      loadUrlBtn.textContent = 'Load';
    }
  }

  // ----- Set data and render -----
  function setData(data, fileName) {
    currentData = data;
    currentFileName = fileName || 'json';
    welcomeSection.classList.add('hidden');
    viewerSection.hidden = false;
    fileNameEl.textContent = fileName ? `File: ${fileName}` : '';
    statusEl.textContent = '';
    renderTree();
    updateStatus();
  }

  function updateStatus() {
    if (!currentData) return;
    const count = countNodes(currentData);
    statusEl.textContent = `Keys/items: ${count.keys}, Nested objects/arrays: ${count.nested}`;
  }

  function countNodes(obj) {
    let keys = 0;
    let nested = 0;
    function walk(o) {
      if (o === null || typeof o !== 'object') return;
      if (Array.isArray(o)) {
        nested++;
        o.forEach((v, i) => { keys++; walk(v); });
      } else {
        nested++;
        Object.keys(o).forEach(k => { keys++; walk(o[k]); });
      }
    }
    walk(currentData);
    return { keys, nested };
  }

  // ----- Escape HTML -----
  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  // ----- Highlight search in string -----
  function highlightMatch(text, query) {
    if (!query || !text || typeof text !== 'string') return escapeHtml(String(text));
    const q = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('(' + q + ')', 'gi');
    return escapeHtml(text).replace(re, '<mark>$1</mark>');
  }

  // ----- Render tree -----
  function getQuery() {
    return (searchInput.value || '').trim().toLowerCase();
  }

  function valueMatchesQuery(value, query) {
    if (!query) return true;
    if (value === null) return 'null'.includes(query);
    if (typeof value === 'boolean') return String(value).includes(query);
    if (typeof value === 'number') return String(value).includes(query);
    if (typeof value === 'string') return value.toLowerCase().includes(query);
    return false;
  }

  function keyMatchesQuery(key, query) {
    return !query || String(key).toLowerCase().includes(query);
  }

  function renderValue(value, path, query) {
    const span = document.createElement('span');
    if (value === null) {
      span.className = 'tree-value null';
      span.innerHTML = highlightMatch('null', query);
    } else if (typeof value === 'boolean') {
      span.className = 'tree-value boolean';
      span.innerHTML = highlightMatch(String(value), query);
    } else if (typeof value === 'number') {
      span.className = 'tree-value number';
      span.innerHTML = highlightMatch(String(value), query);
    } else if (typeof value === 'string') {
      span.className = 'tree-value string';
      const display = value.length > 120 ? value.slice(0, 120) + '…' : value;
      span.innerHTML = '"' + highlightMatch(display, query) + '"';
    } else {
      span.className = 'tree-bracket';
      span.textContent = Array.isArray(value) ? '[]' : '{}';
    }
    return span;
  }

  function buildTreeNode(key, value, path, query) {
    const isObject = value !== null && typeof value === 'object';
    const isArray = Array.isArray(value);
    const hasChildren = isObject && (isArray ? value.length > 0 : Object.keys(value).length > 0);
    const keyStr = typeof key === 'string' ? key : String(key);
    const pathStr = path.join('.');

    const line = document.createElement('div');
    line.className = 'tree-line';
    line.dataset.path = pathStr;
    if (query && (keyMatchesQuery(keyStr, query) || (typeof value !== 'object' && valueMatchesQuery(value, query)))) {
      line.classList.add('highlight');
    }

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'tree-toggle' + (hasChildren ? '' : ' collapsed');
    toggle.setAttribute('aria-label', hasChildren ? 'Collapse' : 'Expand');
    if (hasChildren) {
      toggle.textContent = '▼';
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const ul = line.nextElementSibling;
        if (ul) {
          ul.hidden = !ul.hidden;
          toggle.classList.toggle('collapsed', ul.hidden);
        }
      });
    } else {
      toggle.textContent = '▶';
      toggle.style.visibility = 'hidden';
    }

    const keySpan = document.createElement('span');
    keySpan.className = 'tree-key';
    keySpan.innerHTML = highlightMatch(isArray ? `[${key}]` : keyStr, query);

    const valueSpan = renderValue(value, path, query);

    const actions = document.createElement('span');
    actions.className = 'tree-actions';
    const copyPathBtn = document.createElement('button');
    copyPathBtn.textContent = 'Copy path';
    copyPathBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      copyToClipboard(pathStr);
      showToast('Path copied.');
    });
    const copyValBtn = document.createElement('button');
    copyValBtn.textContent = 'Copy value';
    copyValBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const str = typeof value === 'string' ? value : JSON.stringify(value);
      copyToClipboard(str);
      showToast('Value copied.');
    });
    actions.appendChild(copyPathBtn);
    actions.appendChild(copyValBtn);

    line.appendChild(toggle);
    line.appendChild(keySpan);
    line.appendChild(valueSpan);
    line.appendChild(actions);

    const li = document.createElement('li');
    li.className = 'tree-node';
    li.appendChild(line);

    if (hasChildren) {
      const ul = document.createElement('ul');
      ul.hidden = false;
      if (isArray) {
        value.forEach((v, i) => {
          ul.appendChild(buildTreeNode(i, v, path.concat(i), query));
        });
      } else {
        Object.keys(value).forEach(k => {
          ul.appendChild(buildTreeNode(k, value[k], path.concat(k), query));
        });
      }
      li.appendChild(ul);
    }

    return li;
  }

  function renderTree() {
    treeContainer.innerHTML = '';
    const query = getQuery();
    const root = document.createElement('ul');
    root.className = 'tree-node';
    const rootLine = document.createElement('div');
    rootLine.className = 'tree-line';
    rootLine.dataset.path = '(root)';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'tree-toggle';
    toggle.textContent = '▼';
    toggle.setAttribute('aria-label', 'Collapse');
    const bracket = document.createElement('span');
    bracket.className = 'tree-bracket';
    bracket.textContent = Array.isArray(currentData) ? '[]' : '{}';
    rootLine.appendChild(toggle);
    rootLine.appendChild(bracket);

    const rootUl = document.createElement('ul');
    rootUl.hidden = false;
    if (Array.isArray(currentData)) {
      currentData.forEach((v, i) => {
        rootUl.appendChild(buildTreeNode(i, v, [i], query));
      });
    } else if (currentData !== null && typeof currentData === 'object') {
      Object.keys(currentData).forEach(k => {
        rootUl.appendChild(buildTreeNode(k, currentData[k], [k], query));
      });
    }

    const rootLi = document.createElement('li');
    rootLi.className = 'tree-node';
    rootLi.appendChild(rootLine);
    rootLi.appendChild(rootUl);
    root.appendChild(rootLi);
    treeContainer.appendChild(root);

    toggle.addEventListener('click', () => {
      rootUl.hidden = !rootUl.hidden;
      toggle.classList.toggle('collapsed', rootUl.hidden);
    });
  }

  // ----- Expand / Collapse all -----
  function expandAll() {
    treeContainer.querySelectorAll('ul').forEach(ul => { ul.hidden = false; });
    treeContainer.querySelectorAll('.tree-toggle').forEach(t => t.classList.remove('collapsed'));
    showToast('Expanded all.');
  }

  function collapseAll() {
    treeContainer.querySelectorAll('ul').forEach(ul => { ul.hidden = true; });
    treeContainer.querySelectorAll('.tree-toggle').forEach(t => t.classList.add('collapsed'));
    showToast('Collapsed all.');
  }

  // ----- Copy -----
  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  }

  function copyJson() {
    if (!currentData) return;
    copyToClipboard(JSON.stringify(currentData, null, 2));
    showToast('JSON copied to clipboard.');
  }

  // ----- Search: re-render on input (debounced) -----
  let searchDebounce;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(renderTree, 150);
  });

  // ----- Event bindings -----
  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer?.files?.[0];
    if (file) loadFromFile(file);
  });
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) loadFromFile(file);
    fileInput.value = '';
  });

  loadUrlBtn.addEventListener('click', loadFromUrl);
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadFromUrl();
  });

  expandAllBtn.addEventListener('click', expandAll);
  collapseAllBtn.addEventListener('click', collapseAll);
  copyJsonBtn.addEventListener('click', copyJson);
})();
