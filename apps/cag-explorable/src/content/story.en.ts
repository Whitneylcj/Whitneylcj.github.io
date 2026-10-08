export const story = {
  observe: {
    title: 'Same action. Different times.',
    body: 'Early logs favor low actions. Later logs favor high actions. Meanwhile, response levels fall—even though every period prefers the same action.',
    conclusion: 'The response level changes. The preferred action need not.',
  },
  pool: {
    title: 'A good prediction. A wrong decision.',
    body: 'Pooling hides time. At each action, the ideal predictor mixes different periods. Low actions inherit early, higher responses; high actions inherit later, lower responses.',
    conclusion: 'The problem is the target, not just the fit.',
  },
  geometry: {
    title: 'Keep the shape. Remove the calibration.',
    body: 'Choose a response scale, subtract each period’s response at a reference action, then profile out positive amplitude. Compare the resulting shapes using one shared grid and set of weights.',
    conclusion: 'Different response levels, one decision-relevant shape.',
  },
  deploy: {
    title: 'Choose before you see the future.',
    body: 'The action and response scale are now frozen from history. The dashed continuation carries only dimensionless geometry. Future outcome levels and the oracle action stay hidden until you reveal simulated truth.',
    conclusion: 'Transfer the decision structure, not a fixed outcome level.',
  },
  failure: {
    title: 'What if the shape changes?',
    body: 'Keep the same historical fit. Change only the future shape, then reveal it. The oracle may move while the frozen action stays put. This is where persistence can fail.',
    conclusion: 'Persistence is an assumption—not a promise about every future.',
  },
};
export type StoryCopy = typeof story;
export const STORY_STEPS = [
  {stage:'observe',label:'Observe periods'}, {stage:'pool',label:'Pool across time'},
  {stage:'geometry',label:'Keep the shape'}, {stage:'deploy',label:'Choose before the future'},
  {stage:'failure',label:'Change the future'},
] as const;

import type { ModelData } from '../model';
import type { Language } from './locale';
import { storyZh } from './story.zh';
/** Copy describes the current teaching family without assuming a global time ordering. */
export function currentStory(stage: keyof StoryCopy, model: ModelData, language: Language = 'en'): StoryCopy[keyof StoryCopy] {
  if (language === 'zh') {
    if (stage === 'observe') {
      const logging = model.config.loggingDrift > 0 ? '早期日志偏向小动作，后期偏向大动作。' : '各期使用相同的日志策略。';
      const response = model.config.mode === 'additive' && model.config.amplitudeDrift === 0
        ? model.config.baselineDrift > 0 ? '响应水平随时间下降，但每期偏好的动作相同。' : '各期的已知响应曲线现在重合。'
        : '响应水平和正幅度可以随时间变化，但这些已知曲线仍保持相同的最优动作。';
      return {...storyZh.observe, body: `${logging}${response}`};
    }
    if (stage === 'pool') {
      if (model.pooledIndex === model.trueIndex) return {...storyZh.pool, body:'当前配置下，理想混合预测器仍保持相同的最优动作。观察条件时期权重和已知曲线，可以理解这次为何没有目标偏移。'};
      if (model.config.mode === 'additive' && model.config.amplitudeDrift === 0) return storyZh.pool;
      return {...storyZh.pool, body:'混合隐藏了时期。理想预测器在各动作处使用不同的时期权重。响应水平和幅度的变化进入这个混合，使其偏好的动作偏离已知曲线的最优点。'};
    }
    return storyZh[stage];
  }
  if (stage==='observe') {
    const logging=model.config.loggingDrift>0
      ? 'Early logs favor low actions; later logs favor high actions.'
      : 'Each period uses the same logging policy.';
    const response=model.config.mode==='additive' && model.config.amplitudeDrift===0
      ? model.config.baselineDrift>0 ? 'Response levels fall over time, while every period prefers the same action.' : 'The known response curves now coincide across periods.'
      : 'Response level and positive amplitude can change across periods, while these known curves keep one preferred action.';
    return {...story.observe,body:`${logging} ${response}`};
  }
  if (stage==='pool') {
    if (model.pooledIndex===model.trueIndex) return {...story.pool,body:'The ideal pooled predictor here preserves the preferred action. Inspect the conditional period mix and the known curves to see how this configuration avoids a target shift.'};
    if (model.config.mode==='additive' && model.config.amplitudeDrift===0) return story.pool;
    return {...story.pool,body:'Pooling hides time. At each action, the ideal predictor mixes periods with action-dependent weights. Changing response levels and amplitudes enter that mixture, shifting its preferred action away from the known curves’ optimum.'};
  }
  return story[stage];
}
