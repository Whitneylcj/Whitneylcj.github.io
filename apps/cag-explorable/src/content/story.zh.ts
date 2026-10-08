import type { StoryCopy } from './story.en';
// Translation stays separate from simulation state; language switching belongs to P3.
export const storyZh: StoryCopy = {
  observe: { title:'相同动作，不同时期。',body:'早期日志偏向小动作，后期偏向大动作。同时响应水平下降，但每个时期偏好的动作保持一致。',conclusion:'响应水平变化，最优动作未必变化。' },
  pool: { title:'预测准确，决策仍可出错。',body:'跨时间混合隐藏了时期信息。小动作更多继承早期的高响应，大动作更多继承后期的低响应。',conclusion:'问题在预测目标，而不只在拟合质量。' },
  geometry: { title:'保留形状，移除校准。',body:'选择响应尺度，减去每期在参考动作处的响应，再剔除正幅度。用同一网格和权重比较响应形状。',conclusion:'响应水平不同，决策相关形状仍可相同。' },
  deploy: { title:'先决策，再揭示未来。',body:'动作与尺度已由历史冻结。虚线只表达无量纲响应形状的假定延续。未来结果水平和最优动作在显式揭示前保持隐藏。',conclusion:'传递决策结构，而不是固定的结果水平。' },
  failure: { title:'如果未来形状改变呢？',body:'保持历史拟合不变，只改变未来形状，再揭示真值。未来最优动作可以移动，而冻结动作保持不变。',conclusion:'持续性是一项假设，并非对所有未来的保证。' },
};
