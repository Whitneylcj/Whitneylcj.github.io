import type { GeometryComparison, Link } from '../model/geometry';
import type { GeometryPhase } from '../demo/reducer';
import { useI18n } from '../content/locale';

export function GeometryExplanation({comparison,link,phase}:{comparison:GeometryComparison;link:Link;phase:GeometryPhase}) {
  const { t } = useI18n();
  const fit=comparison[link];
  return <div className="geometry-explanation"><h3>{t(phase==='linked' ? 'A scale acts on the response curve' : phase==='anchored' ? 'An anchor removes response level' : 'Positive amplitude leaves the shape')}</h3>
    <p>{t(phase==='linked' ? 'The link transforms the known conditional mean mₜ(a). Sample points are hidden; taking logs of noisy outcomes would be a different operation.' : phase==='anchored' ? 'Each contrast subtracts the analytic response at the same reference action a₀. The gray reference is distinct from the preferred action.' : 'Divide each linked contrast by its positively profiled amplitude. The shared curve has weighted norm one. Curves only coincide when that scale actually fits.')}</p>
    {fit.status==='ok' && <><p className="geometry-equation">{phase==='linked' ? 'ℓ(mₜ(a))' : phase==='anchored' ? 'Δₜ(a) = ℓ(mₜ(a)) − ℓ(mₜ(a₀))' : 'Δₜ(a) / sₜ ≈ ρ(a)'}</p><p className="control-note">{t('Viewing')} {t(link)} · {t('computed preferred action')} {fit.action.toFixed(4)}{t('. A lower geometry loss need not produce a different action in this monotone teaching family.')}</p></>}
    <details><summary>{t('The fitting rule in this illustration')}</summary><p>{t('sₜ = max(0, ⟨Δₜ, ρ⟩w / ⟨ρ, ρ⟩w). Loss is the period-averaged squared residual divided by each contrast’s energy, using common trapezoidal weights.')}</p><p>{t('The known-curve, fixed-context fit uses aligned power iteration. It does not claim to solve the paper’s general representation or shape-library optimization.')}</p></details>
  </div>;
}
export function EstimatorDisclosure() {
  const { t } = useI18n();
  return <details className="estimator-disclosure"><summary>{t('How this connects to the estimator')}</summary><p>{t('The paper’s two-stage orthogonal estimation workflow separates nuisance learning from held-out geometry selection. This teaching fit implements neither statistical stage.')}</p><ol><li><strong>{t('Observational histories.')}</strong> {t('Identification needs histories, exchangeability and support; time mixing is isolated in this toy model.')}</li><li><strong>{t('Stage 1: cross-fitted response pilots.')}</strong> {t('The paper workflow estimates conditional responses. This browser starts from known curves instead.')}</li><li><strong>{t('Stage 2: held-out orthogonal profiled selection.')}</strong> {t('Candidate scales and geometry are assessed through profiled criteria. Here, the population curves supply the teaching comparison.')}</li><li><strong>{t('Decision rule.')}</strong> {t('The selected geometry defines an action before future outcomes are observed.')}</li></ol><p>{t('Structural illustrations, criterion-level statistical guarantees and conditional policy guarantees are separate claims. The future truth bound above illustrates a structural inequality; it does not implement or validate the full statistical estimator.')}</p></details>;
}
