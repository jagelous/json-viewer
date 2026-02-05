export function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error('Invalid JSON: ' + (e.message || 'parse error'));
  }
}

export function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

export function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

export function highlightMatch(text, query) {
  if (!query || text == null) return escapeHtml(String(text));
  const str = String(text);
  const q = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('(' + q + ')', 'gi');
  return escapeHtml(str).replace(re, '<mark>$1</mark>');
}

export function countNodes(obj) {
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
  walk(obj);
  return { keys, nested };
}

export function collectAllPaths(obj, prefix = '') {
  const paths = [];
  if (obj === null || typeof obj !== 'object') return paths;
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => {
      const p = prefix ? `${prefix}.${i}` : String(i);
      paths.push(p);
      paths.push(...collectAllPaths(v, p));
    });
  } else {
    Object.keys(obj).forEach(k => {
      const p = prefix ? `${prefix}.${k}` : k;
      paths.push(p);
      paths.push(...collectAllPaths(obj[k], p));
    });
  }
  return paths;
}

export function valueMatchesQuery(value, query) {
  if (!query) return true;
  if (value === null) return 'null'.includes(query);
  if (typeof value === 'boolean') return String(value).includes(query);
  if (typeof value === 'number') return String(value).includes(query);
  if (typeof value === 'string') return value.toLowerCase().includes(query);
  return false;
}

export function keyMatchesQuery(key, query) {
  return !query || String(key).toLowerCase().includes(query);
}
