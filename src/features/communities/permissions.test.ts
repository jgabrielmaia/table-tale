import { describe, expect, it } from 'vitest';
import {
  assignableRoles,
  canDeleteCommunity,
  canEditCommunity,
  canLeave,
  canManageLibrary,
  canManageMember,
  joinOutcome,
} from './permissions';
import type { MyMembership } from '@/types/domain';

const m = (role: MyMembership['role'], status: MyMembership['status'] = 'active'): MyMembership => ({ communityId: 'c', role, status });

describe('community permissions', () => {
  it('only active owners and admins edit; only active owners delete', () => {
    expect(canEditCommunity(m('owner'))).toBe(true);
    expect(canEditCommunity(m('admin'))).toBe(true);
    expect(canEditCommunity(m('moderator'))).toBe(false);
    expect(canEditCommunity(m('admin', 'suspended'))).toBe(false);
    expect(canEditCommunity(null)).toBe(false);
    expect(canDeleteCommunity(m('owner'))).toBe(true);
    expect(canDeleteCommunity(m('admin'))).toBe(false);
  });

  it('moderators and above manage the library; members and pending users do not', () => {
    expect(canManageLibrary(m('moderator'))).toBe(true);
    expect(canManageLibrary(m('member'))).toBe(false);
    expect(canManageLibrary(m('owner', 'pending'))).toBe(false);
  });

  it('manages only members ranked below you, never yourself', () => {
    const admin = m('admin');
    expect(canManageMember(admin, { userId: 'u2', role: 'moderator' }, 'u1')).toBe(true);
    expect(canManageMember(admin, { userId: 'u2', role: 'admin' }, 'u1')).toBe(false);
    expect(canManageMember(admin, { userId: 'u2', role: 'owner' }, 'u1')).toBe(false);
    expect(canManageMember(admin, { userId: 'u1', role: 'member' }, 'u1')).toBe(false);
    expect(canManageMember(m('member'), { userId: 'u2', role: 'member' }, 'u1')).toBe(false);
  });

  it('never offers ownership or a role at or above your own', () => {
    expect(assignableRoles(m('owner'))).toEqual(['admin', 'moderator', 'member']);
    expect(assignableRoles(m('admin'))).toEqual(['moderator', 'member']);
    expect(assignableRoles(m('moderator'))).toEqual([]);
  });

  it('the last owner cannot leave; suspended members cannot leave', () => {
    expect(canLeave(m('owner'), 1)).toBe(false);
    expect(canLeave(m('owner'), 2)).toBe(true);
    expect(canLeave(m('member'), 1)).toBe(true);
    expect(canLeave(m('member', 'pending'), 1)).toBe(true);
    expect(canLeave(m('member', 'suspended'), 1)).toBe(false);
  });

  it('public communities admit immediately; private ones wait for approval', () => {
    expect(joinOutcome('public')).toBe('active');
    expect(joinOutcome('private')).toBe('pending');
  });
});
