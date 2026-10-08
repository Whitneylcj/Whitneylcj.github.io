import { describe, expect, it } from 'vitest';
import { defaultState, reducer, type DemoState, type Stage } from '../../src/demo/reducer';
import { decodeShareState, encodeShareState, hydrateSharedState } from '../../src/demo/share';
import { buildModel } from '../../src/model';
import { SAMPLE_SEED } from '../../src/model/constants';
import { auditFuture, freezeHistory } from '../../src/model/future';
import { compareGeometry, rhoAt } from '../../src/model/geometry';

function choose(state: DemoState, stage: 'deploy' | 'failure'): DemoState {
  const model = buildModel(state.config);
  return reducer(state, { type: 'enterFuture', stage,
    frozen: freezeHistory(model, compareGeometry(model, state.anchor), state.anchor) });
}

function restore(hash: string, preferences: { mobile?: boolean; reduced?: boolean } = {}): DemoState {
  const decoded = decodeShareState(hash);
  if (decoded.status !== 'ok') throw new Error(`Expected valid hash: ${JSON.stringify(decoded)}`);
  return hydrateSharedState(decoded.snapshot, preferences);
}

function tamper(hash: string, key: string, value?: string): string {
  const params = new URLSearchParams(hash.slice(1));
  if (value === undefined) params.delete(key); else params.set(key, value);
  return `#${params.toString()}`;
}

describe('P3 versioned semantic sharing', () => {
  it.each<Stage>(['observe', 'pool', 'geometry', 'deploy', 'failure'])('round-trips %s without trusting computed or revealed state', (stage) => {
    let state = reducer(defaultState(), { type: 'anchor', value: 0.613 });
    state = reducer(state, { type: 'period', index: 6 });
    state = reducer(state, { type: 'cursor', index: 327 });
    state = reducer(state, { type: 'language', language: 'zh' });
    state = reducer(state, { type: 'link', link: 'log' });
    state = reducer(state, { type: 'phase', phase: 'normalized' });
    state = reducer(state, { type: 'samples' });
    state = reducer(state, { type: 'sameAction' });
    const futureStage = stage === 'deploy' || stage === 'failure';
    state = futureStage ? choose(state, stage) : reducer(state, { type: 'stage', stage });
    if (futureStage) {
      state = reducer(state, { type: 'futureParam', key: 'offset', value: 6.1 });
      state = reducer(state, { type: 'futureParam', key: 'amplitude', value: 1.3 });
      state = reducer(state, { type: 'futureCase', shock: 1.2 });
      state = reducer(state, { type: 'reveal' });
    }
    const hash = encodeShareState(state);
    expect(hash).toContain(`seed=${SAMPLE_SEED}`);
    expect(hash).not.toMatch(/frozen|revealed|rho|truth|audit|rotating|interactive|camera|hover/);
    const restored = restore(hash, { mobile: true, reduced: true });
    expect(restored).toMatchObject({ stage, preset: 'additive', anchor: 0.613, periodIndex: 6,
      actionIndex: 327, language: 'zh', viewLink: 'log', geometryPhase: 'normalized',
      showSamples: false, sameAction: true, rotating: false, interactive: false,
      revealed: false, futureInvalidated: false });
    expect(buildModel(restored.config)).toEqual(buildModel(state.config));
    if (futureStage) {
      expect(restored.future).toEqual(state.future);
      expect(restored.frozen).not.toBe(state.frozen);
      expect(restored.frozen).toEqual(state.frozen);
      expect(Object.isFrozen(restored.frozen)).toBe(true);
      expect(restored.frozen?.selectedLink).toBe('identity');
      expect(restored.frozen?.fit.action).toBe(0.68);
      expect(rhoAt(restored.frozen!.model, restored.frozen!.fit, 0.613)).toBe(0);
      expect(auditFuture(restored.frozen!, restored.future)).toEqual(auditFuture(state.frozen!, state.future));
    } else expect(restored.frozen).toBeNull();
    expect(encodeShareState(restored)).toBe(hash);
  });

  it('recomputes the fitted link from historical loss independently of viewed scale and future case', () => {
    const identityView = reducer(reducer(defaultState(), { type: 'preset', preset: 'log-amplitude' }),
      { type: 'link', link: 'identity' });
    const chosen = choose(identityView, 'failure');
    const restored = restore(encodeShareState(chosen));
    expect(restored.viewLink).toBe('identity');
    expect(restored.frozen?.selectedLink).toBe('log');
    expect(restored.frozen?.fit.action).toBe(0.68);
    const persistent = restore(tamper(encodeShareState(chosen), 'shock', '0'));
    expect(persistent.frozen).toEqual(restored.frozen);
    expect(restored.future.shock).toBe(2.4);
    expect(persistent.future.shock).toBe(0);
    expect(persistent.revealed).toBe(false);
    const tie = restore(encodeShareState(choose(reducer(defaultState(), { type: 'preset', preset: 'multiplicative' }), 'deploy')));
    expect(tie.frozen?.comparison.tie).toBe(true);
    expect(tie.frozen?.selectedLink).toBe('identity');
  });

  it('never serializes stale future calibration after returning to history or switching presets', () => {
    const calibrated = reducer(choose(defaultState(), 'failure'), { type: 'futureParam', key: 'offset', value: 7.9 });
    const returned = reducer(calibrated, { type: 'stage', stage: 'geometry' });
    const switched = reducer(returned, { type: 'preset', preset: 'log-amplitude' });
    expect(switched.future.offset).toBe(7.9);
    for (const state of [returned, switched]) {
      const hash = encodeShareState(state);
      const params = new URLSearchParams(hash.slice(1));
      for (const key of ['offset', 'amplitude', 'shock']) expect(params.has(key)).toBe(false);
      const restored = restore(hash);
      expect(restored.frozen).toBeNull();
      expect(restored.revealed).toBe(false);
      expect(restored.future.offset).toBe(restored.preset === 'additive' ? 5.2 : 1);
    }
    const invalidatedFuture = reducer(calibrated, { type: 'anchor', value: 0.2 });
    expect(restore(encodeShareState(invalidatedFuture)).stage).toBe('geometry');
  });

  it('restores golden history and future decisions with no data arrays in the URL', () => {
    const initial = restore(encodeShareState(defaultState()));
    const history = buildModel(initial.config);
    expect(history.pooledAction).toBe(0.2175);
    expect(history.trueAction).toBe(0.68);
    const failure = restore(encodeShareState(choose(initial, 'failure')));
    const audit = auditFuture(failure.frozen!, failure.future);
    expect(failure.revealed).toBe(false);
    expect(audit.status).toBe('ok');
    if (audit.status === 'ok') {
      expect(audit.oracleAction).toBe(0.3475);
      expect(audit.geometryAction).toBe(0.68);
    }
  });

  it('allows omitted presentation flags and future calibration to use stage defaults', () => {
    let hash = encodeShareState(choose(defaultState(), 'failure'));
    for (const key of ['samples', 'same', 'offset', 'amplitude', 'shock']) hash = tamper(hash, key);
    expect(restore(hash)).toMatchObject({ showSamples: true, sameAction: false,
      future: { offset: 5.2, amplitude: 0.9, shock: 2.4 }, revealed: false });
  });

  it.each(['', '#experiment', '#model-notes', '#not-a-cag-share', '#cag-notes'])('ignores ordinary document anchor %j', (hash) => {
    expect(decodeShareState(hash)).toEqual({ status: 'empty' });
  });

  it.each([
    ['cag', '2'], ['cag', ''], ['seed', '42'], ['seed', '20261008.0'], ['preset', '__proto__'],
    ['preset', 'unknown'], ['stage', 'future'], ['phase', 'raw'], ['lang', 'fr'], ['link', 'script'],
    ['d', '-0.1'], ['d', '1.2001'], ['l', '1.01'], ['anchor', '1.001'], ['anchor', '-0.01'],
    ['d', 'NaN'], ['d', 'Infinity'], ['d', '1e500'], ['d', '0x1'], ['d', ' '], ['d', ''],
    ['action', '401'], ['action', '-1'], ['action', '0.5'], ['period', '7'], ['period', '-1'],
    ['period', '3.5'], ['samples', 'true'], ['same', 'false'], ['future-truth', '0.68'],
    ['lang', '<script>alert(1)</script>'], ['link', 'identity&seed=42'],
  ])('rejects invalid or injected input %s=%j with a plain diagnostic', (key, value) => {
    const decoded = decodeShareState(tamper(encodeShareState(defaultState()), key, value));
    expect(decoded.status).toBe('invalid');
    if (decoded.status === 'invalid') {
      expect(decoded.message.length).toBeGreaterThan(0);
      expect(decoded.message).not.toContain('<script>');
    }
  });

  it.each(['preset', 'd', 'l', 'anchor', 'link', 'phase', 'stage', 'lang', 'action', 'period'])('rejects missing required %s', (key) => {
    expect(decodeShareState(tamper(encodeShareState(defaultState()), key)).status).toBe('invalid');
  });

  it('rejects duplicate keys including encoded aliases rather than selecting a convenient value', () => {
    const hash = encodeShareState(defaultState());
    for (const suffix of ['&d=1', '&%64=1', '&seed=20261008', '&cag=2']) {
      expect(decodeShareState(hash + suffix).status).toBe('invalid');
    }
  });

  it.each([
    ['offset', '2.99'], ['offset', '8.01'], ['amplitude', '0.199'], ['amplitude', '1.801'],
    ['shock', '-0.01'], ['shock', '2.401'], ['shock', 'NaN'], ['shock', 'Infinity'],
  ])('rejects future calibration outside its UI range %s=%j', (key, value) => {
    expect(decodeShareState(tamper(encodeShareState(choose(defaultState(), 'failure')), key, value)).status).toBe('invalid');
  });

  it('uses log preset ranges for the future offset and refuses future inputs in a historical step', () => {
    const log = encodeShareState(choose(reducer(defaultState(), { type: 'preset', preset: 'log-amplitude' }), 'deploy'));
    for (const value of ['0.199', '1.801', '5.2']) expect(decodeShareState(tamper(log, 'offset', value)).status).toBe('invalid');
    for (const value of ['0.2', '1.8']) expect(decodeShareState(tamper(log, 'offset', value)).status).toBe('ok');
    for (const key of ['offset', 'amplitude', 'shock']) {
      expect(decodeShareState(tamper(encodeShareState(defaultState()), key, '1')).status).toBe('invalid');
    }
  });

  it('restores atomically while keeping touch preferences and only resetting the view for changed history', () => {
    let state = reducer(defaultState({ mobile: true }), { type: 'interaction' });
    state = reducer(state, { type: 'resetView' });
    const display = reducer(state, { type: 'stage', stage: 'geometry' });
    const restored = reducer(state, { type: 'restore', state: restore(encodeShareState(display), { mobile: true }) });
    expect(restored).toMatchObject({ stage: 'geometry', interactive: true, rotating: false, resetKey: state.resetKey });
    const changed = reducer(restored, { type: 'anchor', value: 0.613 });
    const next = reducer(restored, { type: 'restore', state: restore(encodeShareState(changed)) });
    expect(next.resetKey).toBe(restored.resetKey + 1);
    expect(next.anchor).toBe(0.613);
    expect(next.interactive).toBe(true);
    expect(next.rotating).toBe(false);
  });

  it('language changes preserve a revealed historical branch and survive experiment reset', () => {
    const revealed = reducer(choose(defaultState(), 'failure'), { type: 'reveal' });
    const chinese = reducer(revealed, { type: 'language', language: 'zh' });
    expect(chinese.frozen).toBe(revealed.frozen);
    expect(chinese.future).toBe(revealed.future);
    expect(chinese.revealed).toBe(true);
    expect(reducer(chinese, { type: 'reset' }).language).toBe('zh');
  });
});
