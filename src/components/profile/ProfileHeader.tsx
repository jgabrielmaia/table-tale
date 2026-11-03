import type { CSSProperties, ReactNode } from 'react';
import { BrandSymbol, ProgressBar } from '@/components/ui';
import { PlayerAvatar } from '@/components/identity/PlayerAvatar';
import { levelProgress } from '@/lib/progress';
import { formatDate } from '@/lib/format';
import { localizeFaction, t } from '@/i18n';
import type { Faction, Profile } from '@/types/domain';

export interface ProfileHeaderProps {
  profile: Profile;
  faction: Faction | null;
  actions?: ReactNode;
}

export function ProfileHeader({ profile, faction: rawFaction, actions }: ProfileHeaderProps) {
  const faction = rawFaction ? localizeFaction(rawFaction) : null;
  const progress = levelProgress(profile.experiencePoints);
  const factionStyle = faction ? ({ '--c': faction.color } as CSSProperties) : undefined;
  return (
    <section className="profile-card" aria-labelledby="profile-name">
      <PlayerAvatar playerId={profile.id} name={profile.displayName || t('common.player')} src={profile.avatarUrl} size="xl" />
      <div className="profile-id">
        <p className="eyebrow">{t('profile.since', { date: formatDate(profile.createdAt, { month: 'long', year: 'numeric' }) })}</p>
        <h1 id="profile-name">{profile.displayName || t('profile.noName')}</h1>
        <p className="profile-level">
          <span className="level-badge">{t('profile.level', { n: progress.level })}</span>
          <span>{progress.title}</span>
        </p>
        {faction ? (
          <p className="profile-faction" style={factionStyle}>
            <BrandSymbol name={faction.symbol} />
            <span>
              <span className="sr-only">{t('profile.factionSr')}</span>
              {faction.name} <span className="profile-latin" lang="la">· {faction.lore.latin}</span>
            </span>
          </p>
        ) : (
          <p className="profile-faction">{t('profile.noFaction')}</p>
        )}
        {profile.bio && <p className="profile-bio">{profile.bio}</p>}
      </div>
      {actions && <div className="profile-edit flex flex-wrap gap-2">{actions}</div>}
      <div className="xp">
        <div className="xp-head">
          <span id="xp-label">{t('profile.xpTo', { n: progress.level + 1, title: progress.nextTitle })}</span>
          <span className="xp-value">{progress.into} / {progress.needed} XP</span>
        </div>
        <ProgressBar value={progress.into} max={progress.needed} label={t('profile.xpAria', { n: progress.level + 1 })} />
        <p className="xp-hint">
          {t('profile.xpTotal', { xp: profile.experiencePoints })}
        </p>
      </div>
    </section>
  );
}
