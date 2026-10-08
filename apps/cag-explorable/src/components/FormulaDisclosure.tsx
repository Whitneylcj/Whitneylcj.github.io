import { useI18n } from '../content/locale';

export function FormulaDisclosure() {
  const { t } = useI18n();
  return <details className="formula-disclosure">
    <summary>{t('What is the red curve computing?')}</summary>
    <p>{t('The population conditional mean, using seven equally weighted periods:')}</p>
    <div className="equation"><i>q</i>(a) = <span className="fraction"><span>Σ<sub>t</sub> π<sub>t</sub> g<sub>t</sub>(a) m<sub>t</sub>(a)</span><span>Σ<sub>t</sub> π<sub>t</sub> g<sub>t</sub>(a)</span></span></div>
    <p><i>m</i><sub>t</sub> {t('is the known response and')} <i>g</i><sub>t</sub> {t('is the normalized logging density. The conditional weights depend on action. This is an ideal predictor, with no finite-sample fitting error.')}</p>
  </details>;
}
