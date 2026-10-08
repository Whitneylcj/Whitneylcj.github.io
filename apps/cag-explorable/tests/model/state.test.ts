import { describe, expect, it } from 'vitest';
import { defaultState, reducer, type DemoAction, type DemoState } from '../../src/demo/reducer';
import { buildModel } from '../../src/model';
import { compareGeometry } from '../../src/model/geometry';
import { auditFuture, freezeHistory } from '../../src/model/future';

function choose(state: DemoState, stage: 'deploy' | 'failure' = 'deploy'): DemoState {
  const model = buildModel(state.config);
  const frozen = freezeHistory(model, compareGeometry(model, state.anchor), state.anchor);
  return reducer(state, { type: 'enterFuture', stage, frozen });
}

function run(state: DemoState, actions: DemoAction[]): DemoState {
  return actions.reduce(reducer, state);
}

describe('P2 choice, reveal, and branch boundaries', () => {
  it('starts without a future branch, independently of DOM globals and with motion preferences respected', () => {
    const desktop = defaultState();
    expect(desktop.stage).toBe('observe');
    expect(desktop.frozen).toBeNull();
    expect(desktop.revealed).toBe(false);
    expect(desktop.rotating).toBe(true);
    expect(desktop.anchor).toBe(0.5);
    expect(defaultState({ reduced: true }).rotating).toBe(false);
    expect(defaultState({ mobile: true })).toMatchObject({ rotating: false, interactive: false });
    const independent = defaultState();
    desktop.config.baselineDrift = 0;
    expect(independent.config.baselineDrift).toBe(1);
  });

  it('cannot reveal or enter a future through ordinary stage navigation without a historical choice', () => {
    const initial = defaultState();
    const attempted = run(initial, [
      { type: 'stage', stage: 'deploy' }, { type: 'stage', stage: 'failure' }, { type: 'reveal' },
    ]);
    expect(attempted).toBe(initial);
    const chosen = choose(initial);
    expect(chosen.frozen?.fit.action).toBe(0.68);
    expect(chosen.revealed).toBe(false);
    expect(reducer(chosen, { type: 'reveal' }).revealed).toBe(true);
    const returned = reducer(chosen, { type: 'stage', stage: 'geometry' });
    expect(reducer(returned, { type: 'reveal' }).revealed).toBe(false);
  });

  it('freezes the loss-selected historical scale independently of the viewed geometry scale', () => {
    const viewedLog = reducer(defaultState(), { type: 'link', link: 'log' });
    const additive = choose(viewedLog);
    expect(additive.viewLink).toBe('log');
    expect(additive.frozen?.selectedLink).toBe('identity');
    const viewedIdentity = run(defaultState(), [
      { type: 'preset', preset: 'log-amplitude' }, { type: 'link', link: 'identity' },
    ]);
    const logAmplitude = choose(viewedIdentity);
    expect(logAmplitude.viewLink).toBe('identity');
    expect(logAmplitude.frozen?.selectedLink).toBe('log');
    const tie = choose(reducer(defaultState(), { type: 'preset', preset: 'multiplicative' }));
    expect(tie.frozen?.comparison.tie).toBe(true);
    expect(tie.frozen?.selectedLink).toBe('identity');
  });

  it('retains the same historical snapshot through all future calibrations and cases while requiring a new reveal', () => {
    const chosen = choose(defaultState(), 'failure');
    const frozen = chosen.frozen!;
    const historyBefore = JSON.stringify(frozen);
    const actions: DemoAction[] = [
      { type: 'futureParam', key: 'offset', value: 6 },
      { type: 'futureParam', key: 'amplitude', value: 1.3 },
      { type: 'futureParam', key: 'shock', value: 1.2 },
      { type: 'futureCase', shock: 0 },
      { type: 'futureCase', shock: 2.4 },
    ];
    let state = chosen;
    for (const action of actions) {
      state = reducer(reducer(state, { type: 'reveal' }), action);
      expect(state.revealed).toBe(false);
      expect(state.frozen).toBe(frozen);
      expect(JSON.stringify(state.frozen)).toBe(historyBefore);
      const audit = auditFuture(state.frozen!, state.future);
      expect(audit.status).toBe('ok');
      if (audit.status === 'ok') expect(audit.geometryAction).toBe(0.68);
    }
  });

  it.each<DemoAction>([
    { type: 'preset', preset: 'log-amplitude' },
    { type: 'anchor', value: 0.613 },
    { type: 'drift', key: 'baselineDrift', value: 0.4 },
    { type: 'drift', key: 'loggingDrift', value: 0.4 },
  ])('invalidates a revealed historical branch after semantic history edit %j', (edit) => {
    const revealed = reducer(choose(defaultState()), { type: 'reveal' });
    const inHistory = reducer(revealed, { type: 'stage', stage: 'geometry' });
    const edited = reducer(inHistory, edit);
    expect(edited.frozen).toBeNull();
    expect(edited.revealed).toBe(false);
    expect(edited.futureInvalidated).toBe(true);
    const rechosen = choose(edited);
    expect(rechosen.frozen).not.toBe(revealed.frozen);
    expect(rechosen.revealed).toBe(false);
    expect(rechosen.futureInvalidated).toBe(false);
    if (edit.type === 'preset') {
      expect(rechosen.frozen?.selectedLink).toBe('log');
      expect(rechosen.future.offset).toBe(1);
    }
    if (edit.type === 'anchor') expect(rechosen.frozen?.anchor).toBe(0.613);
  });

  it('display, cursor, sample, and camera changes cannot invalidate or alter a historical choice', () => {
    const revealed = reducer(choose(defaultState()), { type: 'reveal' });
    const modified = run(revealed, [
      { type: 'link', link: 'log' }, { type: 'phase', phase: 'normalized' },
      { type: 'period', index: 0 }, { type: 'cursor', index: 360 },
      { type: 'samples' }, { type: 'sameAction' }, { type: 'pause' },
      { type: 'resetView' }, { type: 'interaction' },
    ]);
    expect(modified.frozen).toBe(revealed.frozen);
    expect(modified.revealed).toBe(true);
    expect(modified.future).toBe(revealed.future);
    expect(modified.config).toBe(revealed.config);
    expect(modified.frozen?.fit.action).toBe(0.68);
  });

  it('returning to a future stage keeps the calibration for the same snapshot but hides truth again', () => {
    const chosen = choose(defaultState());
    const calibrated = run(chosen, [
      { type: 'futureParam', key: 'offset', value: 6 },
      { type: 'futureParam', key: 'amplitude', value: 1.3 }, { type: 'reveal' },
      { type: 'stage', stage: 'geometry' },
    ]);
    const returned = reducer(calibrated, { type: 'enterFuture', stage: 'failure', frozen: chosen.frozen! });
    expect(returned.frozen).toBe(chosen.frozen);
    expect(returned.future).toEqual({ offset: 6, amplitude: 1.3, shock: 2.4 });
    expect(returned.revealed).toBe(false);
  });

  it('experiment reset clears future truth and history settings while keeping explicit pause and touch mode', () => {
    const mobile = defaultState({ mobile: true });
    const custom = run(mobile, [
      { type: 'preset', preset: 'log-amplitude' }, { type: 'anchor', value: 0.613 },
      { type: 'link', link: 'log' }, { type: 'phase', phase: 'normalized' },
    ]);
    const revealed = reducer(choose(custom, 'failure'), { type: 'reveal' });
    const reset = reducer(revealed, { type: 'reset' });
    expect(reset).toMatchObject({
      stage: 'observe', preset: 'additive', anchor: 0.5, viewLink: 'identity', geometryPhase: 'linked',
      frozen: null, revealed: false, futureInvalidated: false, rotating: false, interactive: false,
    });
    expect(reset.config).toEqual(defaultState().config);
    expect(reset.future).toEqual({ offset: 5.2, amplitude: 0.9, shock: 0 });
    expect(reset.resetKey).toBe(revealed.resetKey + 1);
  });
});
