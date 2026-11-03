import type { CSSProperties, ReactNode } from 'react';
import { BrandSymbol, ProgressBar } from '@/components/ui';
import { PlayerAvatar } from '@/components/identity/PlayerAvatar';
import { levelProgress } from '@/lib/progress';
import { formatDate } from '@/lib/format';
import type { Faction, Profile } from '@/types/domain';

export interface ProfileHeaderProps {
  profile: Profile;
  faction: Faction | null;
  actions?: ReactNode;
}

export function ProfileHeader({ profile, faction, actions }: ProfileHeaderProps) {
  const progress = levelProgress(profile.experiencePoints);
  const factionStyle = faction ? ({ '--c': faction.color } as CSSProperties) : undefined;
  return (
    <section className="profile-card" aria-labelledby="profile-name">
      <PlayerAvatar playerId={profile.id} name={profile.displayName || 'Jogador'} src={profile.avatarUrl} size="xl" />
      <div className="profile-id">
        <p className="eyebrow">Membro desde {formatDate(profile.createdAt, { month: 'long', year: 'numeric' })}</p>
        <h1 id="profile-name">{profile.displayName || 'Jogador sem nome'}</h1>
        <p className="profile-level">
          <span className="level-badge">Nível {progress.level}</span>
          <span>{progress.title}</span>
        </p>
        {faction ? (
          <p className="profile-faction" style={factionStyle}>
            <BrandSymbol name={faction.symbol} />
            <span>
              <span className="sr-only">Facção: </span>
              {faction.name} <span className="profile-latin" lang="la">· {faction.lore.latin}</span>
            </span>
          </p>
        ) : (
          <p className="profile-faction">Sem facção escolhida</p>
        )}
        {profile.bio && <p className="profile-bio">{profile.bio}</p>}
      </div>
      {actions && <div className="profile-edit flex flex-wrap gap-2">{actions}</div>}
      <div className="xp">
        <div className="xp-head">
          <span id="xp-label">Progresso para o nível {progress.level + 1} — {progress.nextTitle}</span>
          <span className="xp-value">{progress.into} / {progress.needed} XP</span>
        </div>
        <ProgressBar value={progress.into} max={progress.needed} label={`Progresso para o nível ${progress.level + 1}`} />
        <p className="xp-hint">
          {profile.experiencePoints} XP no total. Ganha XP ao registar sessões (+40), concluir jogos (+60), participar em eventos (+50) e desbloquear conquistas (+25).
        </p>
      </div>
    </section>
  );
}
