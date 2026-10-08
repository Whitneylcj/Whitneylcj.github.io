import { useEffect, useMemo, useRef, useState } from 'react';
import type { DemoState } from '../demo/reducer';
import { encodeShareState } from '../demo/share';
import { useI18n } from '../content/locale';

export function ShareControls({state}:{state:DemoState}) {
  const {t}=useI18n();
  const [expanded,setExpanded]=useState(false);
  const [status,setStatus]=useState<'copied'|'manual'|null>(null);
  const input=useRef<HTMLInputElement>(null);
  const button=useRef<HTMLButtonElement>(null);
  const url=useMemo(()=>{
    const link=new URL(window.location.pathname,window.location.origin);
    link.hash=encodeShareState(state);
    return link.href;
  },[state]);
  useEffect(()=>setStatus(null),[url]);
  useEffect(()=>{
    if (!expanded) return;
    const close=(event:KeyboardEvent)=>{if(event.key==='Escape'){setExpanded(false);button.current?.focus();}};
    document.addEventListener('keydown',close);
    return ()=>document.removeEventListener('keydown',close);
  },[expanded]);
  const copy=async()=>{
    setExpanded(true);
    // replaceState changes no model inputs and does not emit a hashchange restore.
    window.history.replaceState(window.history.state,'',url);
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(url);
      setStatus('copied');
    } catch {setStatus('manual');requestAnimationFrame(()=>input.current?.select());}
  };
  return <div className="share-controls">
    <button ref={button} className="share-button" onClick={()=>void copy()}>{t('Copy link')}</button>
    {expanded && <div className="share-popover">
      <label htmlFor="share-link">{t('Shareable experiment link')}</label>
      <input id="share-link" data-testid="share-url" ref={input} value={url} readOnly onFocus={event=>event.currentTarget.select()} />
      <p role="status">{status ? t(status==='copied' ? 'Link copied.' : 'Copy the link below.') : ''}</p>
      <p>{t('Shared futures start hidden and require Reveal again.')}</p>
      <button className="text-button" aria-label={t('Close share link')} onClick={()=>{setExpanded(false);button.current?.focus();}}>{t('Close')}</button>
    </div>}
  </div>;
}
