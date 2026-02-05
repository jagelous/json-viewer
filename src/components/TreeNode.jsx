import React from 'react';
import { highlightMatch, keyMatchesQuery, valueMatchesQuery, copyToClipboard } from '../utils';

export function TreeNode({
  nodeKey,
  value,
  path,
  pathStr,
  query,
  expandedPaths,
  togglePath,
  onToast,
}) {
  const isObject = value !== null && typeof value === 'object';
  const isArray = Array.isArray(value);
  const hasChildren = isObject && (isArray ? value.length > 0 : Object.keys(value).length > 0);
  const keyStr = typeof nodeKey === 'string' ? nodeKey : String(nodeKey);
  const isExpanded = expandedPaths.has(pathStr);
  const highlight =
    query &&
    (keyMatchesQuery(keyStr, query) ||
      (typeof value !== 'object' && valueMatchesQuery(value, query)));

  const handleCopyPath = (e) => {
    e.stopPropagation();
    copyToClipboard(pathStr);
    onToast('Path copied.');
  };
  const handleCopyValue = (e) => {
    e.stopPropagation();
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    copyToClipboard(str);
    onToast('Value copied.');
  };

  let valueContent;
  if (value === null) {
    valueContent = (
      <span
        className="tree-value null"
        dangerouslySetInnerHTML={{ __html: highlightMatch('null', query) }}
      />
    );
  } else if (typeof value === 'boolean') {
    valueContent = (
      <span
        className="tree-value boolean"
        dangerouslySetInnerHTML={{ __html: highlightMatch(String(value), query) }}
      />
    );
  } else if (typeof value === 'number') {
    valueContent = (
      <span
        className="tree-value number"
        dangerouslySetInnerHTML={{ __html: highlightMatch(String(value), query) }}
      />
    );
  } else if (typeof value === 'string') {
    const display = value.length > 120 ? value.slice(0, 120) + '…' : value;
    valueContent = (
      <span
        className="tree-value string"
        dangerouslySetInnerHTML={{ __html: '"' + highlightMatch(display, query) + '"' }}
      />
    );
  } else {
    valueContent = (
      <span className="tree-bracket">{isArray ? '[]' : '{}'}</span>
    );
  }

  return (
    <li className="tree-node">
      <div className={`tree-line ${highlight ? 'highlight' : ''}`} data-path={pathStr}>
        <button
          type="button"
          className={`tree-toggle ${hasChildren && !isExpanded ? 'collapsed' : ''}`}
          aria-label={hasChildren ? (isExpanded ? 'Collapse' : 'Expand') : 'Expand'}
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) togglePath(pathStr);
          }}
          style={hasChildren ? {} : { visibility: 'hidden' }}
        >
          {hasChildren ? '▼' : '▶'}
        </button>
        <span
          className="tree-key"
          dangerouslySetInnerHTML={{
            __html: highlightMatch(isArray ? `[${nodeKey}]` : keyStr, query) + ':',
          }}
        />
        {valueContent}
        <span className="tree-actions">
          <button type="button" onClick={handleCopyPath}>
            Copy path
          </button>
          <button type="button" onClick={handleCopyValue}>
            Copy value
          </button>
        </span>
      </div>
      {hasChildren && isExpanded && (
        <ul>
          {isArray
            ? value.map((v, i) => {
                const childPathStr = pathStr ? `${pathStr}.${i}` : String(i);
                return (
                  <TreeNode
                    key={i}
                    nodeKey={i}
                    value={v}
                    path={path.concat(i)}
                    pathStr={childPathStr}
                    query={query}
                    expandedPaths={expandedPaths}
                    togglePath={togglePath}
                    onToast={onToast}
                  />
                );
              })
            : Object.keys(value).map((k) => {
                const childPathStr = pathStr ? `${pathStr}.${k}` : k;
                return (
                  <TreeNode
                    key={k}
                    nodeKey={k}
                    value={value[k]}
                    path={path.concat(k)}
                    pathStr={childPathStr}
                    query={query}
                    expandedPaths={expandedPaths}
                    togglePath={togglePath}
                    onToast={onToast}
                  />
                );
              })}
        </ul>
      )}
    </li>
  );
}
