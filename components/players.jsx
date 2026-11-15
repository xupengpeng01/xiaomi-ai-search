'use client';

import { useEffect, useRef, useState } from 'react';
import { Asset, IconButton, Overlay, VectorIcon } from './controls';
import { imagePath } from './demo-data.mjs';

export function PhotoViewer({ photos, index, onChange, onClose }) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [more, setMore] = useState(false);
  const file = photos[index];
  const photo = file.cover === 'photo0' ? 'photo-preview' : file.cover;

  function change(offset) {
    onChange((index + offset + photos.length) % photos.length);
    setZoom(100);
    setRotation(0);
  }

  return (
    <Overlay label="照片预览" className="photo-overlay" onClose={onClose} onKeyDown={(event) => {
      if (event.key === 'ArrowLeft') change(-1);
      if (event.key === 'ArrowRight') change(1);
    }}>
      <header className="preview-heading flex items-center justify-between"><h2>{file.name}</h2><IconButton label="关闭照片" onClick={onClose}><VectorIcon name="photoClose" width="36" height="36" /></IconButton></header>
      <div className="preview-image"><Asset name={photo} alt={file.name} style={{ transform: `scale(${zoom / 100}) rotate(${rotation}deg)` }} /></div>
      <div className="photo-tools flex items-center">
        <IconButton label="上一张" onClick={() => change(-1)}><VectorIcon name="photoLeft" width="16" height="16" /></IconButton><span>{index + 1} / {photos.length}</span><IconButton label="下一张" onClick={() => change(1)}><VectorIcon name="photoRight" width="16" height="16" /></IconButton>
        <span className="tool-divider" />
        <IconButton label="放大" onClick={() => setZoom(Math.min(250, zoom + 25))}><VectorIcon name="zoomIn" width="16" height="16" /></IconButton><span>{zoom}%</span><IconButton label="缩小" onClick={() => setZoom(Math.max(50, zoom - 25))}><VectorIcon name="zoomOut" width="16" height="16" /></IconButton>
        <IconButton label="原始比例" onClick={() => setZoom(100)}><VectorIcon name="fitPhoto" width="16" height="16" /></IconButton>
        <span className="tool-divider" />
        <IconButton label="旋转" onClick={() => setRotation((rotation + 90) % 360)}><VectorIcon name="rotation" width="16" height="16" /></IconButton>
        <IconButton label="照片选项" aria-expanded={more} onClick={() => setMore(!more)}><VectorIcon name="photoMore" width="16" height="16" /></IconButton>
        {more && <a className="photo-download" href={imagePath(photo)} download={file.name.replace(/\.jpg$/, '.png')}>保存图片</a>}
      </div>
    </Overlay>
  );
}

function formatTime(value) {
  const seconds = Math.max(0, Math.floor(value));
  const minutes = Math.floor(seconds / 60);
  const remainder = String(seconds % 60).padStart(2, '0');
  if (minutes < 60) return `${minutes}:${remainder}`;
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}:${remainder}`;
}
const playbackRates = [0.5, 1, 1.5, 2];

function PlaybackRates({ speed, onSelect }) {
  return <><span>播放速度</span>{playbackRates.map((rate) => <button key={rate} type="button" aria-pressed={speed === rate} onClick={() => onSelect(rate)}>{rate}×</button>)}</>;
}

function getMatchedSegment(segment, duration) {
  if (!segment || !Number.isFinite(duration) || duration <= 0) return null;
  const start = Math.max(0, segment.start);
  const end = Math.min(duration, segment.end);
  return end > start ? { start, end } : null;
}

export function MediaPlayer({ file, video = false, notice, onClose, onFileAction, onNotice }) {
  const realVideo = video && Boolean(file.source);
  const mediaRef = useRef(null);
  const limitToMatch = useRef(false);
  const matchedSegmentEnded = useRef(false);
  const previousVolume = useRef(60);
  const [playing, setPlaying] = useState(!realVideo);
  const [position, setPosition] = useState(realVideo ? 0 : 146);
  const [duration, setDuration] = useState(realVideo ? 0 : 1303);
  const [volume, setVolume] = useState(60);
  const [muted, setMuted] = useState(false);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [more, setMore] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [savingFrame, setSavingFrame] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const matchedSegment = getMatchedSegment(video ? file.matchedSegment : null, duration);

  useEffect(() => {
    if (realVideo || !playing) return;
    const timer = window.setInterval(() => setPosition((current) => Math.min(duration, current + 1)), 1000 / speed);
    return () => window.clearInterval(timer);
  }, [realVideo, playing, speed, duration]);

  useEffect(() => {
    if (volume > 0) previousVolume.current = volume;
    const media = mediaRef.current;
    if (!media) return;
    media.volume = volume / 100;
    media.muted = muted;
    media.playbackRate = speed;
  }, [volume, muted, speed]);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;
    function startPlayback() {
      const segment = getMatchedSegment(file.matchedSegment, media.duration);
      const start = segment?.start ?? 0;
      limitToMatch.current = Boolean(segment);
      matchedSegmentEnded.current = false;
      media.currentTime = start;
      setPosition(start);
      media.play().catch((error) => {
        if (mediaRef.current !== media || error.name === 'AbortError') return;
        setPlaying(false);
        if (error.name !== 'NotAllowedError') setMediaError('视频无法播放，请检查文件格式或重新加载。');
      });
    }
    if (media.readyState >= 1) startPlayback();
    else media.addEventListener('loadedmetadata', startPlayback, { once: true });
    return () => {
      media.removeEventListener('loadedmetadata', startPlayback);
      media.pause();
    };
  }, [file.source, file.matchedSegment]);

  async function togglePlayback() {
    const media = mediaRef.current;
    if (media) {
      if (!media.paused) { media.pause(); return; }
      if (media.ended || matchedSegmentEnded.current) {
        media.currentTime = matchedSegment?.start ?? 0;
        setPosition(media.currentTime);
        limitToMatch.current = Boolean(matchedSegment);
        matchedSegmentEnded.current = false;
      }
      try {
        await media.play();
        setMediaError('');
      } catch (error) {
        if (mediaRef.current !== media || error.name === 'AbortError') return;
        setPlaying(false);
        setMediaError('播放未能开始，请再次点击播放或检查文件。');
      }
      return;
    }
    if (position >= duration) { setPosition(0); setPlaying(true); }
    else setPlaying(!playing);
  }

  function seek(nextPosition) {
    const next = Math.max(0, Math.min(duration, nextPosition));
    limitToMatch.current = Boolean(matchedSegment && next >= matchedSegment.start && next < matchedSegment.end);
    matchedSegmentEnded.current = false;
    if (mediaRef.current) mediaRef.current.currentTime = next;
    setPosition(next);
  }

  function syncPosition(event) {
    const media = event.currentTarget;
    if (limitToMatch.current && matchedSegment && media.currentTime >= matchedSegment.end) {
      limitToMatch.current = false;
      matchedSegmentEnded.current = true;
      media.pause();
      media.currentTime = matchedSegment.end;
      setPlaying(false);
      setPosition(matchedSegment.end);
      return;
    }
    setPosition(media.currentTime);
  }

  function syncDuration(event) {
    const actual = event.currentTarget.duration;
    if (Number.isFinite(actual) && actual > 0) setDuration(actual);
  }

  function changeSpeed(rate) {
    setSpeed(rate);
    setMore(false);
  }

  function toggleMute() {
    if (muted || volume === 0) {
      if (volume === 0) setVolume(previousVolume.current);
      setMuted(false);
    } else setMuted(true);
  }

  async function saveCurrentFrame() {
    const media = mediaRef.current;
    if (!media || media.readyState < 2 || media.seeking || !media.videoWidth || !media.videoHeight) {
      onNotice?.('画面加载中，请稍后重试');
      return;
    }
    setSavingFrame(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = media.videoWidth;
      canvas.height = media.videoHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Frame capture unavailable');
      context.drawImage(media, 0, 0, canvas.width, canvas.height);
      const timestamp = `${formatTime(media.currentTime).replaceAll(':', '-')}-${String(Math.floor(media.currentTime * 1000) % 1000).padStart(3, '0')}`;
      const frame = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!frame) throw new Error('Frame encoding failed');
      const url = URL.createObjectURL(frame);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${file.name.replace(/\.[^.]+$/, '')}-${timestamp}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      onNotice?.('已下载当前帧');
    } catch {
      onNotice?.('保存画面失败，请稍后重试');
    } finally {
      setSavingFrame(false);
    }
  }

  const isPlaying = playing && position < duration;
  const volumeLevel = muted ? 0 : volume;
  const progressInput = <input className="progress" type="range" aria-label="播放进度" aria-valuetext={`${formatTime(position)} / ${formatTime(duration)}`} min="0" max={duration} step="any" value={position} disabled={!duration} style={{ '--level': `${duration ? position / duration * 100 : 0}%` }} onChange={(event) => seek(Number(event.target.value))} onKeyDown={(event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    seek(position + (event.key === 'ArrowLeft' ? -10 : 10));
  }} />;
  const progress = matchedSegment ? (
    <div className="matched-progress" style={{ '--match-start': `${matchedSegment.start / duration * 100}%`, '--match-end': `${matchedSegment.end / duration * 100}%` }} title={`命中片段 ${formatTime(matchedSegment.start)}–${formatTime(matchedSegment.end)}`}>
      <span className="matched-progress-rail" aria-hidden="true"><span className="match-before" /><span className="match-segment" /><span className="match-after" /></span>
      {progressInput}
    </div>
  ) : progressInput;
  const time = <span className="media-time">{formatTime(position)} / {formatTime(duration)}</span>;
  const playback = (
    <IconButton label={isPlaying ? '暂停' : '播放'} onClick={togglePlayback}>
      {isPlaying ? (video ? <VectorIcon name="playPause" width="20" height="20" /> : <VectorIcon name="audioPause" width="16" height="16" />) : <span className="play-mark" aria-hidden="true" />}
    </IconButton>
  );
  const volumeInput = <input type="range" aria-label="音量大小" aria-orientation={video ? 'horizontal' : 'vertical'} min="0" max="100" value={volumeLevel} onChange={(event) => { setVolume(Number(event.target.value)); setMuted(false); }} />;
  const volumeIcon = video ? (volumeLevel ? 'videoVolumeIcon' : 'videoMutedIcon') : (volumeLevel ? 'audioVolume' : 'audioMutedIcon');
  const volumeControl = (
    <div className={`volume-control ${video ? 'video-volume' : 'audio-volume'}`} data-open={volumeOpen || undefined}
      onPointerEnter={() => { setMore(false); setVolumeOpen(true); }}
      onPointerLeave={(event) => {
        if (event.pointerType !== 'touch' && event.currentTarget.querySelector('input') !== document.activeElement) setVolumeOpen(false);
      }}
      onFocus={() => { setMore(false); setVolumeOpen(true); }}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget) && !event.currentTarget.matches(':hover')) setVolumeOpen(false); }}>
      <IconButton label={volumeLevel ? '静音' : '取消静音'} aria-pressed={!volumeLevel} className="volume-trigger" onClick={() => { setVolumeOpen(true); toggleMute(); }}>
        <VectorIcon name={volumeIcon} width="16" height="16" />
      </IconButton>
      {volumeOpen && (video ? <div className="video-volume-slider">{volumeInput}</div> : <div className="volume-popover">
        <output aria-hidden="true">{volumeLevel}</output>
        <span className="volume-vertical-rail" style={{ '--level': `${volumeLevel}%` }} aria-hidden="true" />
        {volumeInput}
      </div>)}
    </div>
  );

  if (!video) return (
    <section className="audio-player" aria-label="音频播放器" onKeyDown={(event) => {
      if (event.key !== 'Escape') return;
      if (volumeOpen) setVolumeOpen(false);
      else if (more) setMore(false);
      else onClose();
    }}>
      {playback}
      <div className="audio-track">
        <div className="audio-track-label flex items-center justify-between gap-2">
          <span className="audio-title truncate" title={file.name}>{file.name}</span>
          <div className="media-more">
            <button type="button" aria-label="音频播放速度" aria-expanded={Boolean(more)} onClick={() => { setVolumeOpen(false); setMore(!more); }}>{time}</button>
            {more && <div className="speed-popover"><PlaybackRates speed={speed} onSelect={changeSpeed} /></div>}
          </div>
        </div>
        {progress}
      </div>
      {volumeControl}
      <IconButton label="关闭播放器" onClick={onClose}><span className="close-mark" aria-hidden="true" /></IconButton>
    </section>
  );

  const controls = (
    <div className="transport">
      {progress}
      <div className="transport-controls flex items-center gap-2">
        {playback}
        <IconButton label="后退 10 秒" disabled={!duration} onClick={() => seek(position - 10)}><VectorIcon name="playBack" width="20" height="20" /></IconButton>
        <IconButton label="前进 10 秒" disabled={!duration} onClick={() => seek(position + 10)}><VectorIcon name="playForward" width="20" height="20" /></IconButton>
        {volumeControl}
        {time}
        <div className="media-more ml-auto flex items-center gap-2">
          <IconButton label="保存当前帧" disabled={!realVideo || savingFrame} onClick={saveCurrentFrame}><VectorIcon name="saveVideoFrame" width="20" height="20" /></IconButton>
          <IconButton label="播放选项" aria-expanded={Boolean(more)} onClick={() => { setVolumeOpen(false); setMore(more ? false : 'actions'); }}><VectorIcon name="playMore" width="20" height="20" /></IconButton>
          {more && <div className="speed-popover">
            {more === 'actions' ? <><button type="button" onClick={() => setMore('speed')}>打开方式</button>{['复制', '复制文件路径', '另存为', '打开所在位置', '属性'].map((action) => <button key={action} type="button" onClick={() => { setMore(false); onFileAction?.(action, file); }}>{action}</button>)}</> : <><span>内置播放器</span><PlaybackRates speed={speed} onSelect={changeSpeed} /></>}
          </div>}
        </div>
      </div>
    </div>
  );

  return (
    <Overlay label="视频预览" className="video-overlay" onClose={onClose}>
      <header className="video-heading flex items-center justify-between"><h2>{file.name}</h2><IconButton label="关闭视频" onClick={onClose}><VectorIcon name="photoClose" width="36" height="36" /></IconButton></header>
      <div className="video-stage">
        {realVideo ? <video ref={mediaRef} src={file.source} poster={imagePath(file.cover)} aria-label={file.name} preload="metadata" playsInline
          onLoadedMetadata={syncDuration} onDurationChange={syncDuration}
          onTimeUpdate={syncPosition}
          onPlay={() => { setPlaying(true); setMediaError(''); }} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
          onVolumeChange={(event) => { setVolume(Math.round(event.currentTarget.volume * 100)); setMuted(event.currentTarget.muted); }}
          onError={() => { setPlaying(false); setMediaError('视频加载失败，请检查 public/videos/ 中的文件。'); }}
          onClick={togglePlayback} /> : <Asset name={file.id === 'video-1' ? 'poster' : file.cover} alt={file.name} />}
        {realVideo && !duration && !mediaError && <div className="video-feedback" role="status">视频加载中…</div>}
        {mediaError && <div className="video-feedback" role="alert">{mediaError}</div>}
      </div>
      {controls}
      {notice && <div role="status" className="notice">{notice}</div>}
    </Overlay>
  );
}
