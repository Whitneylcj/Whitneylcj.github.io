import { lazy, Suspense, useCallback, useEffect, useMemo, useReducer, useRef, useState, type Dispatch } from 'react';
import { buildModel } from './model';
import { compareGeometry } from './model/geometry';
import { auditFuture, freezeHistory } from './model/future';
import { selectView, geometryPresentation, futurePresentation } from './demo/selectors';
import { initialState, reducer, defaultState, type Stage, type DemoState, type DemoAction } from './demo/reducer';
import { currentStory, STORY_STEPS } from './content/story.en';
import { ControlsPanel } from './components/ControlsPanel';
import { MetricReadout } from './components/MetricReadout';
import { FormulaDisclosure } from './components/FormulaDisclosure';
import { GeometryControls } from './components/GeometryControls';
import { FutureControls, FutureReadout } from './components/FutureControls';
import { GeometryExplanation, EstimatorDisclosure } from './components/GeometryExplanation';
import { CurveSlice2D } from './visual/CurveSlice2D';
import { MixtureBar } from './visual/MixtureBar';
import { GeometrySlice2D } from './visual/GeometrySlice2D';
import { FuturePlot2D } from './visual/FuturePlot2D';
import { LocaleProvider, useI18n, type Language } from './content/locale';
import { decodeShareState, hydrateSharedState } from './demo/share';
import { ShareControls } from './components/ShareControls';
import { PaperEvidence } from './components/PaperEvidence';
import './visual/scene.css';
import './components/p2.css';

const Scene3D = lazy(() => import('./visual/Scene3D').then(module => ({ default: module.Scene3D })));
function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2');
    if (!context) return false;
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch { return false; }
}

function browserPreferences() {
  return {mobile:window.matchMedia('(max-width: 760px)').matches,reduced:window.matchMedia('(prefers-reduced-motion: reduce)').matches};
}
function initialExperiment() {
  const decoded=decodeShareState(window.location.hash);
  if (decoded.status==='ok') {
    try {return {state:hydrateSharedState(decoded.snapshot,browserPreferences()),notice:'restored' as const};}
    catch {return {state:initialState(),notice:'invalid' as const};}
  }
  return {state:initialState(),notice:decoded.status==='invalid' ? 'invalid' as const : null};
}
export default function App() {
  const initial=useMemo(initialExperiment,[]);
  const [state,dispatch]=useReducer(reducer,initial.state);
  return <LocaleProvider language={state.language}><Experiment state={state} rawDispatch={dispatch} initialNotice={initial.notice} /></LocaleProvider>;
}
function Experiment({state,rawDispatch,initialNotice}:{state:DemoState;rawDispatch:Dispatch<DemoAction>;initialNotice:'restored'|'invalid'|null}) {
  const {t}=useI18n();
  const [hoverPeriod,setHoverPeriod]=useState<number|null>(null);
  const [cameraView,setCameraView]=useState<'orbit'|'front'>('orbit');
  const [linkNotice,setLinkNotice]=useState(initialNotice);
  const dispatch=useCallback((action:DemoAction)=>{
    if (action.type!=='restore') setLinkNotice(null);
    if (action.type==='reset' || action.type==='restore') {setCameraView('orbit');setHoverPeriod(null);}
    rawDispatch(action);
  },[rawDispatch]);
  const [webGL, setWebGL] = useState(supportsWebGL);
  const [active, setActive] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [transitionError, setTransitionError] = useState('');
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const stageRef = useRef<HTMLDivElement>(null);
  // Raw data depends on history configuration, never anchor, view phase or future.
  const model = useMemo(() => buildModel(state.config), [state.config]);
  const comparison = useMemo(() => compareGeometry(model,state.anchor), [model,state.anchor]);
  const view = useMemo(() => selectView(model,hoverPeriod ?? state.periodIndex,state.actionIndex), [model,state.periodIndex,state.actionIndex,hoverPeriod]);
  const futureStage = state.stage==='deploy' || state.stage==='failure';
  const geometryStage = state.stage==='geometry';
  // Future truth is not even computed before Reveal.
  const audit = useMemo(() => futureStage && state.revealed && state.frozen ? auditFuture(state.frozen,state.future) : null,
    [futureStage,state.revealed,state.frozen,state.future]);
  const presentation = useMemo(() => geometryStage ? geometryPresentation(model,comparison,state.viewLink,state.geometryPhase,state.anchor)
    : futureStage && state.frozen ? futurePresentation(state.frozen,audit) : null,
    [geometryStage,futureStage,model,comparison,state.viewLink,state.geometryPhase,state.anchor,state.frozen,audit]);
  const pooled = state.stage==='pool';
  const copy = currentStory(state.stage,model,state.language);
  const pause = useCallback(()=>dispatch({type:'pause'}), [dispatch]);
  const unavailable = useCallback(()=>setWebGL(false), []);
  const selectPeriod = useCallback((index:number)=>dispatch({type:'period',index}), [dispatch]);
  const selectAction = useCallback((index:number)=>dispatch({type:'cursor',index}), [dispatch]);
  const changeStage = (stage:Stage) => {
    setTransitionError('');
    if (stage==='deploy' || stage==='failure') {
      try {
        const frozen=state.frozen ?? freezeHistory(model,comparison,state.anchor);
        dispatch({type:'enterFuture',stage,frozen});
      } catch (error) { setTransitionError(error instanceof Error ? error.message : 'No identified history geometry to freeze.'); }
    } else dispatch({type:'stage',stage});
  };

  useEffect(()=>setHoverPeriod(null),[state.stage,state.config,state.geometryPhase]);
  useEffect(()=>{
    document.documentElement.lang=state.language==='zh' ? 'zh-CN' : 'en';
    document.title=`CAG — ${t('When prediction gets the decision wrong.')}`;
    const meta=document.querySelector('meta[name="description"]');
    meta?.setAttribute('content',state.language==='zh' ? '探索时间相关日志与响应漂移如何改变理想混合预测器的最优动作，并检验动作几何在未来的持续性。已知响应曲线的 CAG 教学示意。' : 'Explore time-dependent logging, pooled prediction and causal action geometry with a known-response teaching model.');
  },[state.language,t]);
  useEffect(()=>{
    const restore=()=>{
      const decoded=decodeShareState(window.location.hash);
      if (decoded.status==='empty') return;
      try {
        const next=decoded.status==='ok' ? hydrateSharedState(decoded.snapshot,browserPreferences()) : defaultState(browserPreferences());
        dispatch({type:'restore',state:next});
        setLinkNotice(decoded.status==='ok' ? 'restored' : 'invalid');
      } catch {dispatch({type:'restore',state:defaultState(browserPreferences())});setLinkNotice('invalid');}
    };
    window.addEventListener('hashchange',restore);
    return ()=>window.removeEventListener('hashchange',restore);
  },[dispatch]);
  useEffect(() => {
    let intersecting=true;
    const update=()=>setActive(intersecting && !document.hidden);
    const observer=new IntersectionObserver(entries=>{intersecting=entries[0].isIntersecting;update();});
    if (stageRef.current) observer.observe(stageRef.current);
    document.addEventListener('visibilitychange',update);
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    const stop=()=>{setReducedMotion(reduced.matches);if(reduced.matches)pause();};
    reduced.addEventListener('change',stop);
    return ()=>{observer.disconnect();document.removeEventListener('visibilitychange',update);reduced.removeEventListener('change',stop);};
  }, [pause]);
  useEffect(() => {
    const update=()=>setFullscreen(document.fullscreenElement===stageRef.current);
    document.addEventListener('fullscreenchange',update);
    return ()=>document.removeEventListener('fullscreenchange',update);
  }, []);
  const toggleFullscreen=async()=>{
    if(document.fullscreenElement)await document.exitFullscreen();
    else await stageRef.current?.requestFullscreen?.();
  };

  return <><a href="#experiment" className="skip-link">{t('Skip to experiment')}</a><main>
    <header className="site-header"><a href="#experiment" className="wordmark" aria-label={t('CAG experiment')}>CAG<span className="wordmark-lines" aria-hidden="true"><i/><i/><i/></span></a><span className="header-caption">{t('An explorable explanation')}</span><div className="header-tools"><select aria-label={t('Language')} data-testid="language-select" value={state.language} onChange={e=>dispatch({type:'language',language:e.target.value as Language})}><option value="en">English</option><option value="zh">中文</option></select><ShareControls state={state} /><a href="#model-notes" className="header-link">{t('About this model')}</a></div></header>
    <div className="intro"><h1>{state.language==='en' ? <>When prediction gets<br className="desktop-break" /> the decision wrong.</> : t('When prediction gets the decision wrong.')}</h1><p>{t('Outcome levels drift.')}<span>{t('Action geometry may persist.')}</span></p></div>
    <section id="experiment" tabIndex={-1} aria-label={t('Interactive CAG teaching experiment')}>
      <nav className="story-tabs" aria-label={t('Experiment steps')}>{STORY_STEPS.map((step,i)=><button key={step.stage} aria-pressed={state.stage===step.stage} onClick={()=>changeStage(step.stage)}><span className="step-number" aria-hidden="true">{i+1}</span>{t(step.label)}</button>)}</nav>
      {linkNotice && <p role="status" data-testid="share-notice" className="share-notice">{t(linkNotice==='restored' ? 'Shared inputs restored. Future truth stays hidden until Reveal.' : 'The shared link is invalid or uses an unsupported version. Showing the default experiment.')}</p>}
      {transitionError && <p role="status" className="audit-status">{t(transitionError)}</p>}
      <div className={`experiment-grid ${geometryStage || futureStage ? 'p2-layout' : ''}`}>
        <aside className="narrative">
          <div className="story-copy"><h2>{copy.title}</h2><p>{copy.body}</p></div>
          {geometryStage ? <GeometryControls state={state} comparison={comparison} dispatch={dispatch} /> : futureStage ? <FutureControls state={state} dispatch={dispatch} /> : <ControlsPanel state={state} dispatch={dispatch} />}
          {!futureStage && <MetricReadout model={model} />}
          {futureStage && <FutureReadout audit={audit} link={state.frozen?.selectedLink ?? 'identity'} />}
          {state.futureInvalidated && <p className="branch-note" role="status">{t('The previous future branch was discarded because the history changed. Choose again to freeze the new history.')}</p>}
          <p className="takeaway">{copy.conclusion}</p>
        </aside>
        <div className="stage-shell" ref={stageRef}>
          <div className="stage-toolbar"><span>{t(presentation?.yLabel ?? 'Action × period × response')}</span><div>
            <button onClick={()=>dispatch({type:'rotation'})} disabled={!webGL}>{t(state.rotating ? 'Pause rotation' : 'Resume rotation')}</button>
            <button onClick={()=>{setCameraView('orbit');dispatch({type:'resetView'});}} disabled={!webGL}>{t('Reset view')}</button><button onClick={()=>{setCameraView('front');dispatch({type:'resetView'});pause();}} disabled={!webGL}>{t('Front view')}</button>
            {typeof document.documentElement.requestFullscreen==='function' && <button aria-label={t(fullscreen ? 'Exit fullscreen' : 'Fullscreen scene')} onClick={()=>void toggleFullscreen().catch(()=>{})}>{fullscreen ? t('Exit') : '⛶'}</button>}
          </div></div>
          <div className="stage-canvas">{geometryStage && !presentation ? <div className="scene-unavailable" role="status">{comparison[state.viewLink].status!=='ok' ? t('The selected scale has no valid action geometry.') : ''}</div>
            : webGL ? <Suspense fallback={<div className="scene-unavailable" role="status">{t('Loading the 3D experiment…')}</div>}><Scene3D view={view} pooled={pooled} presentation={presentation ?? undefined} showSamples={state.showSamples} sameAction={state.sameAction} rotating={state.rotating && active} animateProjection={active && !reducedMotion} interactive={state.interactive} resetKey={state.resetKey} onInteract={pause} onPeriodChange={selectPeriod} onPeriodHover={setHoverPeriod} cameraView={cameraView} onUnavailable={unavailable} /></Suspense>
            : <div className="scene-unavailable" role="status"><strong>{t('3D is unavailable. The 2D experiment remains fully interactive.')}</strong><p>{t('Use the controls and synchronized plots below.')}</p></div>}
          </div>
          <div className="stage-options">
            {!geometryStage && !futureStage && <><label className="checkbox-field"><input type="checkbox" checked={state.showSamples} onChange={()=>dispatch({type:'samples'})} />{t('Show samples')}</label><button className="same-action" aria-pressed={state.sameAction} onClick={()=>dispatch({type:'sameAction'})}>{t('Same action, all periods')}</button></>}
            <label className="period-select">{t('Period')} <select aria-label={t('Period')} value={state.periodIndex} onChange={e=>selectPeriod(Number(e.target.value))}>{model.times.map((time,i)=><option key={i} value={i}>{i+1} · {i===0 ? t('Early') : i===3 ? t('Middle') : i===6 ? t('Late') : `t = ${time.toFixed(2)}`}</option>)}</select></label>
            <button className="mobile-interaction" aria-pressed={state.interactive} onClick={()=>dispatch({type:'interaction'})}>{t(state.interactive ? 'Disable 3D interaction' : 'Enable 3D interaction')}</button>
            {(geometryStage || futureStage) && <span className="presentation-note">{t(geometryStage ? (state.geometryPhase==='normalized' ? 'Time depth collapsed for shape comparison' : 'Seven known response curves; samples hidden') : (audit?.status==='ok' ? (audit.normalizedTruth ? 'Revealed truth divided by its positively profiled amplitude' : 'Scaled comparison unavailable; raw truth remains below') : state.revealed ? 'Future diagnostic unavailable' : 'Dashed future: dimensionless assumed continuation'))}</span>}
          </div>
          {state.sameAction && !geometryStage && !futureStage && <dl className="same-action-values" aria-label={`${t('Known responses at action')} ${view.action.toFixed(3)}`}>{view.sameActionResponses.map((value,i)=><div key={i}><dt>t{i+1}</dt><dd>{value.toFixed(2)}</dd></div>)}</dl>}
          {(geometryStage || futureStage) && <div className="shared-cursor"><label htmlFor="stage-cursor">{t('Action cursor')} <output>a = {view.action.toFixed(3)}</output></label><input id="stage-cursor" aria-label={t('Action cursor')} aria-valuetext={`a = ${view.action.toFixed(3)}`} type="range" min="0" max={model.actions.length-1} step="1" value={state.actionIndex} onChange={event=>selectAction(Number(event.target.value))} /><p>{t('The cursor changes the view, not the frozen decision.')}</p></div>}
          {hoverPeriod!==null && <span className="hover-note">{t('Previewing hovered period')} {hoverPeriod+1}</span>}
          <p className="truth-note">{geometryStage || futureStage ? <><span>{t('Illustrative geometry fit on known response curves')}</span>{t('. No full CAG estimator is trained on these points.')}</> : t('Known synthetic response curves. Illustrative geometry; no CAG estimator is trained on these points.')}</p>
        </div>
        {geometryStage ? <div className="p2-linked-panel">{presentation ? <GeometrySlice2D presentation={presentation} periodIndex={view.periodIndex} viewLinkLabel={state.viewLink} onActionChange={selectAction} actionIndex={state.actionIndex} /> : <p role="status">{t('No valid action geometry on this response scale.')}</p>}<GeometryExplanation comparison={comparison} link={state.viewLink} phase={state.geometryPhase} /></div>
          : futureStage && state.frozen ? <div className="p2-linked-panel"><FuturePlot2D actions={state.frozen.model.actions} rho={state.frozen.fit.rho} chosenAction={state.frozen.fit.action} audit={audit} onActionChange={selectAction} actionIndex={state.actionIndex} rawExtent={state.frozen.model.config.mode==='log' ? [0,16] : [-1,10]} /></div> : null}
      </div>
      {!geometryStage && !futureStage && <div className="linked-charts"><CurveSlice2D view={view} pooled={pooled} onActionChange={selectAction} /><MixtureBar view={view} onActionChange={selectAction} /></div>}
      {pooled && <p className="pooled-caption"><span className="line-key red" /><strong>{t('Ideal pooled predictor')}</strong><span>{t('Population E[Y | A = a], not a poor fit.')}</span></p>}
    </section>
    <section id="model-notes" className="model-notes" aria-label={t('Teaching model notes')}><FormulaDisclosure /><EstimatorDisclosure /><details><summary>{t('A teaching model, with a defined scope')}</summary><p>{t('This fixed-history example isolates time mixing. The additive default fixes amplitude drift at zero; log presets introduce positive amplitude drift or a historical scale tie.')}</p><p>{t("It is not a paper experiment, a causal identification demonstration from confounded logs, or the full CAG estimator. The paper's synthetic, RDSS and Taobao results are separate. All responses, sample points and revealed future diagnostics here are simulated.")}</p><p>{t('A historical tie need not identify the scale that persists into future calibration. Geometry loss and deployment regret are different quantities.')}</p></details></section>
    <PaperEvidence />
    <footer><span>{t('Causal action geometry')}</span><span>{t('Teaching model · P3 review')}</span></footer>
  </main></>;
}
