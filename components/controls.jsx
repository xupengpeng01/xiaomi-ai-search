'use client';

import { useEffect, useRef, useState } from 'react';
import { devices, filters, imagePath } from './demo-data.mjs';

export function Asset({ name, ...props }) {
  return <img src={imagePath(name)} alt="" draggable={false} {...props} />;
}

export function VectorIcon({ name, ...props }) {
  return <img src={`/figma/${name}.svg`} alt="" draggable={false} {...props} />;
}

export function IconButton({ label, children, className = '', ...props }) {
  return <button type="button" aria-label={label} title={label} className={`icon-button ${className}`} {...props}>{children}</button>;
}

export function DesktopBar({ onOpen, active }) {
  return (
    <div className="desktop-bar">
      <div className="weather flex items-center gap-3" aria-label="24 摄氏度，晴朗">
        <VectorIcon name="sun" width="20" height="20" />
        <div>24°C<br />晴朗</div>
      </div>
      <div className="desktop-apps flex items-center gap-1">
        <VectorIcon name="start" width="40" height="40" />
        <VectorIcon name="taskSearch" width="220" height="32" className="desktop-search-art" />
        <Asset name="copilot" width="40" height="40" />
        <VectorIcon name="taskView" width="40" height="40" />
        <Asset name="explorer" width="40" height="40" />
        <Asset name="store" width="40" height="40" />
        <IconButton label="打开 AI 文件搜索" className={`desktop-launch ${active ? '' : 'inactive'}`} onClick={onOpen}>
          <VectorIcon name="taskSearchApp" width="40" height="40" />
        </IconButton>
      </div>
      <VectorIcon name="tray" width="232" height="40" className="tray" />
    </div>
  );
}

export function TitleBar({ results, onBack, onMinimize, onClose }) {
  return (
    <header className="titlebar flex shrink-0 items-center justify-between">
      <div className="flex h-full items-center gap-1">
        {results && <IconButton label="返回首页" className="caption back" onClick={onBack}><VectorIcon name="back" width="18" height="18" /></IconButton>}
        <span className={`flex items-center gap-1 ${results ? '' : 'pl-2'}`}><VectorIcon name="title" width="16" height="16" />AI 文件搜索</span>
      </div>
      <div className="caption-group flex">
        <IconButton label="最小化" className="caption" onClick={onMinimize}><VectorIcon name="minimize" width="44" height="32" /></IconButton>
        <IconButton label="关闭" className="caption close" onClick={onClose}><VectorIcon name="close" width="44" height="32" /></IconButton>
      </div>
    </header>
  );
}

export function SearchForm({ value, onChange, onSearch, home, inputRef }) {
  return (
    <form role="search" className={`search-form ${home ? 'search-home' : ''}`} onSubmit={(event) => { event.preventDefault(); onSearch(value); }}>
      <div className="search-input flex min-w-0 flex-1 items-center">
        <input ref={inputRef} aria-label="搜索文件" value={value} onChange={(event) => onChange(event.target.value)} placeholder="试着搜“团建合照”" autoComplete="off" spellCheck={false} />
        {value && <IconButton label="清除关键词" className="clear-query" onClick={() => { onChange(''); inputRef.current?.focus(); }}><VectorIcon name="queryClear" width="16" height="16" /></IconButton>}
      </div>
      <button className="search-submit" type="submit">搜索</button>
    </form>
  );
}

export function DeviceTabs({ selected, onChange }) {
  function handleKeys(event, index) {
    const offsets = { ArrowLeft: -1, ArrowRight: 1, Home: -index, End: devices.length - 1 - index };
    if (!(event.key in offsets)) return;
    event.preventDefault();
    const next = (index + offsets[event.key] + devices.length) % devices.length;
    onChange(next);
    event.currentTarget.parentElement.children[next].focus();
  }

  return (
    <div role="tablist" aria-label="设备" className="device-tabs flex items-end">
      {devices.map((device, index) => <button key={device} id={`device-${index}`} role="tab" type="button" tabIndex={selected === index ? 0 : -1} aria-selected={selected === index} aria-controls="device-panel" onClick={() => onChange(index)} onKeyDown={(event) => handleKeys(event, index)}>{device}</button>)}
    </div>
  );
}

export function FilterBar({ selected, onChange }) {
  return (
    <nav aria-label="文件类型" className="filters flex items-center gap-1.5">
      {filters.map((filter, index) => <button key={`${filter}-${index}`} type="button" aria-pressed={selected === index} onClick={() => onChange(index)}>{filter}</button>)}
    </nav>
  );
}

export function History({ entries, onSearch, onRemove, onClear }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const visible = expanded ? entries : entries.slice(0, editing ? 4 : 5);

  return (
    <section className="history" aria-label="搜索历史">
      <div className="history-header flex items-center justify-between">
        <h2 className="flex items-center gap-1 font-medium"><VectorIcon name="clock" width="17" height="17" />搜索历史</h2>
        {editing ? (
          <div className="history-actions flex gap-3">
            <button type="button" onClick={() => { onClear(); setExpanded(false); setEditing(false); }}>清空历史</button>
            <button type="button" onClick={() => setEditing(false)}>完成</button>
          </div>
        ) : entries.length > 0 && <IconButton label="管理搜索历史" onClick={() => setEditing(true)}><VectorIcon name="trash" width="16" height="16" /></IconButton>}
      </div>
      {entries.length ? (
        <div className="history-list flex flex-wrap items-center gap-3">
          {visible.map((entry) => (
            <div key={entry} className={`history-chip ${editing ? 'editing' : ''}`}>
              <button type="button" onClick={() => onSearch(entry)}>{entry}</button>
              {editing && <IconButton label={`删除 ${entry}`} onClick={() => onRemove(entry)}><VectorIcon name="historyRemove" width="16" height="16" /></IconButton>}
            </div>
          ))}
          {entries.length > (editing ? 4 : 5) && <IconButton label={expanded ? '收起历史' : '展开历史'} aria-expanded={expanded} className="history-expand" onClick={() => setExpanded(!expanded)}><VectorIcon name="chevron" width="9" height="5" className={expanded ? 'rotate-180' : ''} /></IconButton>}
        </div>
      ) : <p className="mt-3 text-xs text-[#999]">暂无搜索历史</p>}
    </section>
  );
}

export function Overlay({ label, className = '', children, onClose, onKeyDown }) {
  const dialog = useRef(null);

  useEffect(() => {
    const node = dialog.current;
    if (!node?.open) node?.showModal();
    return () => { if (node?.open) node.close(); };
  }, []);

  return (
    <dialog ref={dialog} aria-label={label} className={`overlay ${className}`} onCancel={(event) => { event.preventDefault(); onClose(); }} onKeyDown={onKeyDown}>
      {children}
    </dialog>
  );
}
