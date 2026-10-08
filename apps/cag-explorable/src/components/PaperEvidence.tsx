import { PAPER } from '../content/paper';
import { useI18n } from '../content/locale';

export function PaperEvidence() {
  const {t}=useI18n();
  return <section id="paper-evidence" className="paper-evidence" aria-labelledby="paper-heading">
    <div><h2 id="paper-heading">{t('Paper & evidence')}</h2><p className="paper-venue">{t(PAPER.venue)}</p></div>
    <div><h3>{PAPER.title}</h3><p className="paper-authors">{PAPER.authors}</p>
      <p>{t('The paper develops a two-stage orthogonal estimator and reports synthetic and e-commerce pricing experiments. The interactive numbers above come from a separate known-response teaching model.')}</p>
      <a href={PAPER.officialUrl} target="_blank" rel="noopener noreferrer" className="paper-link">{t('Official NeurIPS page')}</a>
      <p className="paper-note">{t('The official page is the source for paper information. Numerical paper results are not reproduced in this explorable.')}</p>
    </div>
  </section>;
}
