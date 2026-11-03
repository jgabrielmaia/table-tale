import { Avatar, type AvatarProps } from '@/components/ui/Avatar';
import { useActiveIdentity } from '@/hooks/useFate';
import { PlayerIdentityFrame } from './PlayerIdentityFrame';

interface PlayerAvatarProps extends AvatarProps {
  playerId: string | null | undefined;
}

/** Avatar that wears the player's active seasonal frame, when they have one. Use for every player avatar. */
export function PlayerAvatar({ playerId, ...avatar }: PlayerAvatarProps) {
  const identity = useActiveIdentity(playerId);
  const node = <Avatar {...avatar} />;
  return identity ? (
    <PlayerIdentityFrame cardId={identity.cardId} size={avatar.size ?? 'sm'}>{node}</PlayerIdentityFrame>
  ) : node;
}
