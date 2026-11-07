import type { CommunityRole, MembershipStatus, MyMembership } from '@/types/domain';

/** Mirrors the database rules (RLS + tg_guard_membership). The database stays the source of truth. */
export const ROLE_RANK: Record<CommunityRole, number> = { owner: 4, admin: 3, moderator: 2, member: 1 };

type Membership = Pick<MyMembership, 'role' | 'status'> | null | undefined;

const isActive = (m: Membership): m is Pick<MyMembership, 'role' | 'status'> => m?.status === 'active';

export const isActiveMember = (m: Membership) => isActive(m);
export const canEditCommunity = (m: Membership) => isActive(m) && (m.role === 'owner' || m.role === 'admin');
export const canDeleteCommunity = (m: Membership) => isActive(m) && m.role === 'owner';
export const canManageLibrary = (m: Membership) => isActive(m) && m.role !== 'member';
export const canManageMembers = (m: Membership) => isActive(m) && m.role !== 'member';

/** Whether `actor` may change or remove a member holding `target`'s role. Nobody manages themselves here. */
export function canManageMember(actor: Membership, target: { userId: string; role: CommunityRole }, actorId: string | null): boolean {
  if (!isActive(actor) || actor.role === 'member') return false;
  if (target.userId === actorId) return false;
  return ROLE_RANK[target.role] < ROLE_RANK[actor.role];
}

/** Roles the actor may assign (never equal or above their own; ownership moves only by transfer). */
export function assignableRoles(actor: Membership): CommunityRole[] {
  if (!isActive(actor) || (actor.role !== 'owner' && actor.role !== 'admin')) return [];
  return (['admin', 'moderator', 'member'] as CommunityRole[]).filter((r) => ROLE_RANK[r] < ROLE_RANK[actor.role]);
}

/** The last active owner cannot leave: ownership must be transferred first. */
export function canLeave(membership: Membership, activeOwners: number): boolean {
  if (!membership || membership.status === 'suspended') return false;
  if (membership.role === 'owner' && membership.status === 'active') return activeOwners > 1;
  return true;
}

export function joinOutcome(visibility: 'public' | 'private'): Extract<MembershipStatus, 'active' | 'pending'> {
  return visibility === 'public' ? 'active' : 'pending';
}
