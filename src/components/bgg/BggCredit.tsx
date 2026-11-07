import { t } from '@/i18n';

export const BGG_URL = 'https://boardgamegeek.com';

/**
 * Attribution required by BoardGameGeek's XML API terms wherever BGG data is shown. It is a text badge because the
 * official "Powered by BGG" logo file has to be supplied by the project owner (see docs/bgg-integration.md);
 * swap the text for the image then, keeping the link.
 */
export function BggCredit({ className }: { className?: string }) {
  return (
    <a className={['bgg-credit', className].filter(Boolean).join(' ')} href={BGG_URL} target="_blank" rel="noopener noreferrer" aria-label={t('bgg.poweredAria')}>
      Powered by BGG
    </a>
  );
}
