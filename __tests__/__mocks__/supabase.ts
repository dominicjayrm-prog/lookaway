/**
 * Mock Supabase client — returns empty data for all queries.
 */
const mockFrom = () => ({
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  gt: jest.fn().mockReturnThis(),
  lt: jest.fn().mockReturnThis(),
  or: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  not: jest.fn().mockReturnThis(),
  ilike: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  then: jest.fn().mockResolvedValue({ data: [], error: null }),
});

export const supabase = {
  from: jest.fn(mockFrom),
  auth: {
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    session: jest.fn().mockReturnValue(null),
  },
  rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
};
