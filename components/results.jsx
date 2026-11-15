'use client';

import { useEffect, useState } from 'react';
import { Asset, IconButton, Overlay, VectorIcon } from './controls';
import { groupFiles } from './demo-data.mjs';

function HighlightMatch({ text, query }) {
  if (!query) return text;
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.split(new RegExp(`(${escapedQuery})`, 'gi')).map((part, index) => (
    index % 2 ? <mark key={index}>{part}</mark> : part
  ));
}

function ResultItem({ file, query, active, onOpen, onMenu }) {
  function showMenu(event) {
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    onMenu(file, event.clientX || bounds.left + 16, event.clientY || bounds.bottom);
  }

  return (
    <button type="button" className={file.cover ? 'media-item' : 'file-row'} data-file-type={file.type} data-menu-active={active || undefined} onClick={() => onOpen(file)} onContextMenu={showMenu} onKeyDown={(event) => {
      if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) showMenu(event);
    }} title={file.name}>
      {file.cover ? (
        <>
          <span className="media-thumb">
            <Asset name={file.cover} width="86" height="86" />
            {file.duration && <>
              <VectorIcon name="playGlyph" width="24" height="24" className="media-play" />
              <span className="duration">{file.duration}</span>
            </>}
          </span>
          <span className="media-name">{file.name.replace(/(?=\.[^.]+$)/, '\u200b')}</span>
        </>
      ) : (
        <>
          <VectorIcon name={file.icon} width="36" height="36" className="shrink-0" />
          <span className="file-text flex min-w-0 flex-1 flex-col">
            <span className="file-name truncate font-medium"><HighlightMatch text={file.name} query={query} /></span>
            <span className="file-path truncate"><HighlightMatch text={file.path} query={query} /></span>
            {file.snippet && <span className="file-snippet truncate"><HighlightMatch text={file.snippet} query={query} /></span>}
          </span>
          <time className="file-date">{file.date}</time>
        </>
      )}
    </button>
  );
}

function ResultGroup({ heading, files, query, activeFile, onOpen, onMenu, onMore }) {
  return (
    <section className={`result-group ${heading === '最佳匹配' ? 'best-match' : ''}`}>
      <div className="result-heading flex items-center justify-between">
        <h2>{heading}</h2>
        {onMore && <button type="button" onClick={onMore}>更多</button>}
      </div>
      <div className={`result-card ${files[0].cover ? 'media-grid' : 'file-list'}`}>
        {files.map((file) => <ResultItem key={file.id} file={file} query={query} active={activeFile === file.id} onOpen={onOpen} onMenu={onMenu} />)}
      </div>
    </section>
  );
}

export function Results({ files, query, filter, activeFile, onOpen, onMenu, onMore }) {
  if (!files.length) {
    return <div className="empty-result flex flex-col items-center justify-center" role="status"><VectorIcon name="empty" width="88" height="56" />未搜索到相关内容</div>;
  }

  const [first, ...rest] = files;
  const groups = groupFiles(filter ? files : rest, !filter);

  return (
    <div className="results-container">
      {!filter && <ResultGroup heading="最佳匹配" files={[first]} query={query} activeFile={activeFile} onOpen={onOpen} onMenu={onMenu} />}
      {groups.map(([type, items]) => <ResultGroup key={type} heading={type} files={items} query={query} activeFile={activeFile} onOpen={onOpen} onMenu={onMenu} onMore={!filter && items[0].cover ? () => onMore(type) : undefined} />)}
    </div>
  );
}

const menuOptions = [
  ['打开', 'menuOpen'], ['打开方式', 'menuOpenWith'], ['复制', 'menuCopy'],
  ['复制文件路径', 'menuLink'], ['另存为', 'menuSave'], ['打开所在位置', 'menuLocation'], ['属性', 'menuInfo'],
];

export function ContextMenu({ selection, onAction, onClose }) {
  const [submenu, setSubmenu] = useState(false);

  useEffect(() => {
    const dismiss = (event) => { if (!event.target.closest('.context-menu')) onClose(); };
    const escape = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('pointerdown', dismiss);
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('pointerdown', dismiss);
      window.removeEventListener('keydown', escape);
    };
  }, [onClose]);

  const left = Math.max(8, Math.min(selection.x, selection.width - (submenu ? 324 : 188)));
  const top = Math.max(8, Math.min(selection.y, selection.height - 270));

  return (
    <div role="menu" aria-label="文件操作" className="context-menu" style={{ left, top }}>
      <div className="context-items">
        {menuOptions.map(([option, icon], index) => option === '打开方式' ? (
          <button key={option} type="button" role="menuitem" aria-haspopup="menu" aria-expanded={submenu} onClick={() => setSubmenu(!submenu)}>
            <VectorIcon name={icon} width="20" height="20" />{option}<VectorIcon name="menuArrow" width="12" height="12" className="ml-auto" />
          </button>
        ) : <button key={option} type="button" role="menuitem" autoFocus={index === 0} onClick={() => onAction(option, selection.file)}><VectorIcon name={icon} width="20" height="20" />{option}</button>)}
      </div>
      {submenu && <div className="context-submenu" role="menu" aria-label="打开方式"><button type="button" role="menuitem" onClick={() => onAction('打开', selection.file)}>使用内置预览</button></div>}
    </div>
  );
}

export function FileDetails({ file, mode, onClose }) {
  return (
    <Overlay label={mode} className="details-overlay" onClose={onClose}>
      <div className="detail-panel">
        <header className="flex items-center justify-between"><h2>{mode}</h2><IconButton label="关闭弹窗" onClick={onClose}><span className="close-mark" aria-hidden="true" /></IconButton></header>
        <div className="detail-content">
          <div className="flex items-center gap-3">{file.icon && <VectorIcon name={file.icon} width="36" height="36" />}<strong className="break-all">{file.name}</strong></div>
          <dl><dt>类型</dt><dd>{file.type}</dd><dt>位置</dt><dd>{file.path}</dd><dt>修改时间</dt><dd>{file.date}</dd></dl>
          {mode === '预览' && <p>{file.snippet || '此演示文件仅提供基本信息。'}</p>}
          <button className="action-button" type="button" onClick={onClose}>完成</button>
        </div>
      </div>
    </Overlay>
  );
}
