import React, { useState, useCallback } from 'react';
import { TreeNode } from './components/TreeNode';
import {
  parseJson,
  copyToClipboard,
  countNodes,
  collectAllPaths,
} from './utils';

// Same-origin proxy (Vite dev server) — no CORS when running npm run dev
const SAME_ORIGIN_PROXY = '/api/fetch';
// Fallback when deployed without backend (e.g. static host)
const FALLBACK_PROXY = (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`;
const DEFAULT_URL =
  'https://horizonblue.sapphiremrfhub.com/tocs/202602/2026-02-01_horizon-healthcare-services-i_index.json';

function App() {
  const [data, setData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPaths, setExpandedPaths] = useState(new Set(['']));
  const [toast, setToast] = useState({ message: '', type: 'success', show: false });
  const [url, setUrl] = useState(DEFAULT_URL);
  const [useCorsProxy, setUseCorsProxy] = useState(false);
  const [urlLoading, setUrlLoading] = useState(false);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, show: true });
    const tid = setTimeout(() => setToast((t) => ({ ...t, show: false })), 2500);
    return () => clearTimeout(tid);
  }, []);

  const loadFromFile = useCallback(
    (file) => {
      const name = (file.name || '').toLowerCase();
      const type = (file.type || '').toLowerCase();
      const isJson =
        name.endsWith('.json') ||
        type === 'application/json' ||
        type === 'text/json' ||
        type === 'text/plain';
      if (!isJson) {
        showToast('Please choose a .json file.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = parseJson(e.target.result);
          setData(parsed);
          setFileName(file.name);
          setExpandedPaths(new Set(['']));
        } catch (err) {
          showToast(err.message, 'error');
        }
      };
      reader.onerror = () => showToast('Failed to read file.', 'error');
      reader.readAsText(file, 'UTF-8');
    },
    [showToast]
  );

  const loadFromUrl = useCallback(async () => {
    const raw = url.trim();
    if (!raw) {
      showToast('Enter a URL first.', 'error');
      return;
    }
    setUrlLoading(true);
    try {
      let text;
      if (useCorsProxy) {
        // Prefer same-origin proxy (Vite dev server fetches server-side → no CORS)
        const proxyUrl = `${SAME_ORIGIN_PROXY}?url=${encodeURIComponent(raw)}`;
        let res = await fetch(proxyUrl, { method: 'GET' }).catch(() => null);
        if (res?.ok) {
          text = await res.text();
        } else {
          // Fallback for production or when dev proxy unavailable
          res = await fetch(FALLBACK_PROXY(raw), { method: 'GET' });
          if (!res.ok) throw new Error(await res.text() || 'HTTP ' + res.status);
          text = await res.text();
        }
      } else {
        const res = await fetch(raw, { method: 'GET' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        text = await res.text();
      }
      const parsed = parseJson(text);
      const name = raw.replace(/^.*\//, '').replace(/\?.*$/, '') || 'response.json';
      setData(parsed);
      setFileName(name);
      setExpandedPaths(new Set(['']));
      showToast(useCorsProxy ? 'Loaded via CORS proxy.' : 'Loaded from URL.');
    } catch (err) {
      const isNetwork =
        err.name === 'TypeError' && (err.message || '').toLowerCase().includes('fetch');
      const msg =
        isNetwork && !useCorsProxy
          ? 'Blocked by CORS. Check "Use CORS proxy" and click Load again.'
          : (err.message || 'Failed to load URL.');
      showToast(msg, 'error');
    } finally {
      setUrlLoading(false);
    }
  }, [url, useCorsProxy, showToast]);

  const togglePath = useCallback((pathStr) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(pathStr)) next.delete(pathStr);
      else next.add(pathStr);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    if (!data) return;
    const all = new Set(['', ...collectAllPaths(data)]);
    setExpandedPaths(all);
    showToast('Expanded all.');
  }, [data, showToast]);

  const collapseAll = useCallback(() => {
    setExpandedPaths(new Set(['']));
    showToast('Collapsed all.');
  }, [showToast]);

  const copyJson = useCallback(() => {
    if (!data) return;
    copyToClipboard(JSON.stringify(data, null, 2));
    showToast('JSON copied to clipboard.');
  }, [data, showToast]);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.currentTarget.classList.remove('dragover');
      const file = e.dataTransfer?.files?.[0];
      if (file) loadFromFile(file);
    },
    [loadFromFile]
  );
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
  }, []);
  const handleDragLeave = useCallback((e) => {
    e.currentTarget.classList.remove('dragover');
  }, []);
  const handleFileChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file) loadFromFile(file);
      e.target.value = '';
    },
    [loadFromFile]
  );

  const query = searchQuery.trim().toLowerCase();
  const statusText =
    data &&
    (() => {
      const c = countNodes(data);
      return `Keys/items: ${c.keys}, Nested objects/arrays: ${c.nested}`;
    })();

  return (
    <div className="app">
      <header className="header">
        <h1 className="logo">JSON Viewer</h1>
        <p className="tagline">
          Upload a file or paste a URL — explore your data in a clear, navigable tree.
        </p>
      </header>

      <section className="input-section">
        <div className="input-card upload-card">
          <input
            type="file"
            id="fileInput"
            accept=".json,application/json"
            aria-label="Choose JSON file"
            hidden
            onChange={handleFileChange}
          />
          <div
            className="drop-zone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <label htmlFor="fileInput" className="drop-label">
              <span className="drop-icon" aria-hidden="true">
                📁
              </span>
              <span className="drop-text">Drop a JSON file here</span>
              <span className="drop-sub">or click to browse</span>
            </label>
          </div>
        </div>
        <div className="input-card url-card">
          <label htmlFor="urlInput" className="url-label">
            Load from URL
          </label>
          <div className="url-row">
            <input
              type="url"
              id="urlInput"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/data.json"
              className="url-input"
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={loadFromUrl}
              disabled={urlLoading}
            >
              {urlLoading ? 'Loading…' : 'Load'}
            </button>
          </div>
          <label className="proxy-option">
            <input
              type="checkbox"
              className="proxy-checkbox"
              checked={useCorsProxy}
              onChange={(e) => setUseCorsProxy(e.target.checked)}
            />
            <span>Use CORS proxy (fixes "Failed to fetch" on cross-origin URLs)</span>
          </label>
          <p className="url-hint">
            With "Use CORS proxy" the app fetches via the same server (no cross-origin). Restart
            dev server (npm run dev) if the proxy fails.
          </p>
        </div>
      </section>

      {data != null && (
        <section className="viewer-section">
          <div className="toolbar">
            <div className="toolbar-left">
              <input
                type="search"
                className="search-input"
                placeholder="Search keys or values…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
              />
              <button type="button" className="btn btn-ghost" onClick={expandAll}>
                Expand all
              </button>
              <button type="button" className="btn btn-ghost" onClick={collapseAll}>
                Collapse all
              </button>
            </div>
            <div className="toolbar-right">
              <button type="button" className="btn btn-ghost" onClick={copyJson}>
                Copy JSON
              </button>
              {fileName && <span className="file-name">File: {fileName}</span>}
            </div>
          </div>
          <div className="tree-wrapper">
            <div className="tree-container">
              <ul className="tree-node">
                <li className="tree-node">
                  <div className="tree-line" data-path="(root)">
                    <button
                      type="button"
                      className={`tree-toggle ${!expandedPaths.has('') ? 'collapsed' : ''}`}
                      aria-label={expandedPaths.has('') ? 'Collapse' : 'Expand'}
                      onClick={() => togglePath('')}
                    >
                      ▼
                    </button>
                    <span className="tree-bracket">
                      {Array.isArray(data) ? '[]' : '{}'}
                    </span>
                  </div>
                  {expandedPaths.has('') && (
                    <ul>
                      {Array.isArray(data)
                        ? data.map((v, i) => (
                            <TreeNode
                              key={i}
                              nodeKey={i}
                              value={v}
                              path={[i]}
                              pathStr={String(i)}
                              query={query}
                              expandedPaths={expandedPaths}
                              togglePath={togglePath}
                              onToast={showToast}
                            />
                          ))
                        : Object.keys(data).map((k) => (
                            <TreeNode
                              key={k}
                              nodeKey={k}
                              value={data[k]}
                              path={[k]}
                              pathStr={k}
                              query={query}
                              expandedPaths={expandedPaths}
                              togglePath={togglePath}
                              onToast={showToast}
                            />
                          ))}
                    </ul>
                  )}
                </li>
              </ul>
            </div>
          </div>
          {statusText && <div className="status">{statusText}</div>}
        </section>
      )}

      {data == null && (
        <section className="welcome-section">
          <div className="welcome-content">
            <p>
              Upload a <code>.json</code> file or enter a URL above to start exploring.
            </p>
            <p className="welcome-tip">
              Try dragging <code>1.json</code> or <code>2.json</code> from this folder.
            </p>
          </div>
        </section>
      )}

      <div
        className={`toast ${toast.show ? 'show' : ''} ${toast.type}`}
        role="status"
        aria-live="polite"
      >
        {toast.message}
      </div>
    </div>
  );
}

export default App;
