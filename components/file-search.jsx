'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DesktopBar, DeviceTabs, FilterBar, History, SearchForm, TitleBar, VectorIcon } from './controls';
import { filters, findFiles, imagePath, initialHistory, preferredDevice } from './demo-data.mjs';
import { MediaPlayer, PhotoViewer } from './players';
import { ContextMenu, FileDetails, Results } from './results';

const storageKey = 'xiaomi-ai-search.history';

export default function FileSearch() {
  const [shown, setShown] = useState(true);
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [device, setDevice] = useState(0);
  const [filter, setFilter] = useState(0);
  const [history, setHistory] = useState(initialHistory);
  const [historyReady, setHistoryReady] = useState(false);
  const [menu, setMenu] = useState(null);
  const [details, setDetails] = useState(null);
  const [viewer, setViewer] = useState(null);
  const [audio, setAudio] = useState(null);
  const [notice, setNotice] = useState('');
  const inputRef = useRef(null);
  const windowRef = useRef(null);
  const scrollRef = useRef(null);
  const files = findFiles(query, device);
  const visibleFiles = filter ? files.filter((file) => file.type === filters[filter]) : files;
  const closeMenu = useCallback(() => setMenu(null), []);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (Array.isArray(stored)) setHistory(stored.filter((term) => typeof term === 'string').slice(0, 24));
    } catch {}
    setHistoryReady(true);
  }, []);

  useEffect(() => {
    if (!historyReady) return;
    try { localStorage.setItem(storageKey, JSON.stringify(history)); } catch {}
  }, [history, historyReady]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 2400);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => { scrollRef.current?.scrollTo(0, 0); }, [device, filter, query]);

  function goHome() {
    setInput('');
    setQuery('');
    setFilter(0);
    setMenu(null);
    setAudio(null);
  }

  function search(raw, routeToDevice = false) {
    const term = raw.trim();
    if (!term) { inputRef.current?.focus(); return; }
    setInput(term);
    setQuery(term);
    if (routeToDevice) setDevice(preferredDevice(term, device));
    setFilter(0);
    setMenu(null);
    setAudio(null);
    setHistory((current) => [term, ...current.filter((entry) => entry !== term)].slice(0, 24));
  }

  function openFile(file) {
    setMenu(null);
    if (file.type === '图片') {
      const photos = files.filter((candidate) => candidate.type === '图片');
      setViewer({ type: 'photo', photos, index: photos.findIndex((candidate) => candidate.id === file.id) });
    } else if (file.type === '视频') setViewer({ type: 'video', file });
    else if (file.type === '音频') setAudio(file);
    else setDetails({ file, mode: '预览' });
  }

  function openMenu(file, x, y) {
    const bounds = windowRef.current.getBoundingClientRect();
    setMenu({ file, x: x - bounds.left, y: y - bounds.top, width: bounds.width, height: bounds.height });
  }

  async function fileAction(action, file) {
    setMenu(null);
    if (action === '打开') { openFile(file); return; }
    if (action === '复制' || action === '复制文件路径') {
      try {
        await navigator.clipboard.writeText(action === '复制' ? file.name : `${file.path} / ${file.name}`);
        setNotice(action === '复制' ? '已复制文件名' : '已复制文件路径');
      } catch { setDetails({ file, mode: '属性' }); }
      return;
    }
    if (action === '另存为' && file.cover) {
      const link = document.createElement('a');
      link.href = file.source || imagePath(file.cover === 'photo0' ? 'photo-preview' : file.cover);
      link.download = file.source ? file.name : `${file.name.replace(/\.[^.]+$/, '')}.png`;
      link.click();
      return;
    }
    if (action === '另存为') { setNotice('此演示文件没有可下载的原件'); return; }
    setDetails({ file, mode: action });
  }

  function changeDevice(index) {
    setDevice(index);
    setFilter(0);
    setMenu(null);
    setAudio(null);
  }

  function closeWindow() {
    goHome();
    setDevice(0);
    setShown(false);
  }

  const launch = () => setShown(true);
  const searchForm = (home) => <SearchForm home={home} value={input} onChange={setInput} onSearch={(value) => search(value, home && device === 0)} inputRef={inputRef} />;
  const tabs = <DeviceTabs selected={device} onChange={changeDevice} />;

  return (
    <main className="desktop">
      {shown ? (
        <section ref={windowRef} className="app-window flex flex-col" aria-label="AI 文件搜索">
          <TitleBar results={Boolean(query)} onBack={goHome} onMinimize={() => { closeMenu(); setShown(false); }} onClose={closeWindow} />
          {query ? (
            <>
              <div className="results-top shrink-0"><div className="results-width">{searchForm(false)}{tabs}</div></div>
              <div className={`results-scroll ${files.length ? 'has-files' : ''}`} role="tabpanel" id="device-panel" aria-labelledby={`device-${device}`} ref={scrollRef}>
                {files.length > 0 && <div className="results-width"><FilterBar selected={filter} onChange={setFilter} /></div>}
                <Results files={visibleFiles} query={query} filter={filter} activeFile={menu?.file.id} onOpen={openFile} onMenu={openMenu} onMore={(type) => setFilter(filters.indexOf(type))} />
              </div>
            </>
          ) : (
            <div className="home-content">
              <h1 className="home-brand flex items-center justify-center gap-2"><VectorIcon name="brand" width="32" height="32" /><span><span className="brand-initials">AI</span>{' '}文件搜索</span></h1>
              {searchForm(true)}
              {tabs}
              <div role="tabpanel" id="device-panel" aria-labelledby={`device-${device}`}>
                <History entries={history} onSearch={(entry) => search(entry, true)} onRemove={(entry) => setHistory((current) => current.filter((value) => value !== entry))} onClear={() => setHistory([])} />
              </div>
            </div>
          )}
          {audio && <MediaPlayer key={audio.id} file={audio} onClose={() => setAudio(null)} />}
          {menu && <ContextMenu selection={menu} onClose={closeMenu} onAction={fileAction} />}
          {details && <FileDetails {...details} onClose={() => setDetails(null)} />}
          {viewer?.type === 'photo' && <PhotoViewer photos={viewer.photos} index={viewer.index} onChange={(index) => setViewer({ ...viewer, index })} onClose={() => setViewer(null)} />}
          {viewer?.type === 'video' && <MediaPlayer key={viewer.file.id} video file={viewer.file} notice={notice} onNotice={setNotice} onClose={() => setViewer(null)} onFileAction={(action, file) => {
            if (action === '属性' || action === '打开所在位置') setViewer(null);
            fileAction(action, file);
          }} />}
          {notice && viewer?.type !== 'video' && <div role="status" className="notice">{notice}</div>}
        </section>
      ) : <button type="button" className="mobile-launch" onClick={launch}><VectorIcon name="brand" width="32" height="32" />打开 AI 文件搜索</button>}
      <DesktopBar active={shown} onOpen={launch} />
    </main>
  );
}
