/**
 * Tests for addFriendById — the consolidated "add this user as a friend"
 * helper that the QR scanner, search-tap and pending-invite paths all
 * route through. Covers every branch of the AddFriendResult union so a
 * regression in any branch fails loudly here instead of in a Supabase
 * RLS log a week later.
 */

// Mock Supabase before importing the module under test. We rebuild the
// from() chain per call so each test can configure its own response
// without leaking into the next.
type Row = { id: string; status: string };
type FromResult = { data: Row[] | null; error: { message: string } | null };

let nextFromResult: FromResult = { data: [], error: null };
let lastInsertPayload: Record<string, unknown> | null = null;
let nextInsertError: { message: string } | null = null;

jest.mock('@/src/lib/supabase', () => {
  const makeSelectChain = () => ({
    select: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(nextFromResult),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: { username: 'tester' }, error: null }),
  });
  return {
    supabase: {
      from: jest.fn(() => ({
        ...makeSelectChain(),
        // Mock the friendships INSERT path used inside sendFriendRequest.
        insert: jest.fn((payload: Record<string, unknown>) => {
          lastInsertPayload = payload;
          return Promise.resolve({ data: null, error: nextInsertError });
        }),
      })),
    },
  };
});

// notifyFriendRequest is fired-and-forgotten inside sendFriendRequest and
// doesn't affect the outcome — stub it so we don't pull the whole
// notifications module into tests.
jest.mock('@/src/utils/notifications', () => ({
  notifyFriendRequest: jest.fn().mockResolvedValue(undefined),
}));

// checkAchievements is fire-and-forgotten in acceptFriendRequest, but
// addFriendById doesn't call it — still mock to avoid loading the real
// supabase-touching achievements module.
jest.mock('@/src/utils/achievements', () => ({
  checkAchievements: jest.fn().mockResolvedValue(undefined),
}));

import { addFriendById } from '@/src/utils/friends';

beforeEach(() => {
  nextFromResult = { data: [], error: null };
  nextInsertError = null;
  lastInsertPayload = null;
});

describe('addFriendById', () => {
  it('returns "self" when myId === targetId', async () => {
    const result = await addFriendById('user-1', 'user-1');
    expect(result).toBe('self');
  });

  it('returns "error" if myId is empty', async () => {
    const result = await addFriendById('', 'user-2');
    expect(result).toBe('error');
  });

  it('returns "error" if targetId is empty', async () => {
    const result = await addFriendById('user-1', '');
    expect(result).toBe('error');
  });

  it('returns "already_friends" when an accepted row exists', async () => {
    nextFromResult = { data: [{ id: 'fs-1', status: 'accepted' }], error: null };
    const result = await addFriendById('user-1', 'user-2');
    expect(result).toBe('already_friends');
  });

  it('returns "request_pending" when a pending row exists', async () => {
    nextFromResult = { data: [{ id: 'fs-1', status: 'pending' }], error: null };
    const result = await addFriendById('user-1', 'user-2');
    expect(result).toBe('request_pending');
  });

  it('returns "request_pending" for any non-accepted row (declined etc)', async () => {
    // Anything that isn't 'accepted' should be treated as "still in
    // flight" so the user gets a friendly toast instead of a duplicate
    // INSERT that hits an RLS rejection.
    nextFromResult = { data: [{ id: 'fs-1', status: 'declined' }], error: null };
    const result = await addFriendById('user-1', 'user-2');
    expect(result).toBe('request_pending');
  });

  it('returns "sent" and inserts when no existing row', async () => {
    nextFromResult = { data: [], error: null };
    const result = await addFriendById('user-1', 'user-2');
    expect(result).toBe('sent');
    expect(lastInsertPayload).toEqual({
      requester_id: 'user-1',
      addressee_id: 'user-2',
      status: 'pending',
    });
  });

  it('returns "error" when the existence check fails', async () => {
    nextFromResult = { data: null, error: { message: 'rls violation' } };
    const result = await addFriendById('user-1', 'user-2');
    expect(result).toBe('error');
  });

  it('returns "error" when the INSERT fails', async () => {
    nextFromResult = { data: [], error: null };
    nextInsertError = { message: 'duplicate key' };
    const result = await addFriendById('user-1', 'user-2');
    expect(result).toBe('error');
  });
});
