// Prisma's interactive transactions default to a 5s timeout and a 2s wait for a
// connection, both sized for a database on the same host. This deployment
// reaches a pooled Postgres in another region, where a handful of statements
// routinely exceeds that and fails with "Transaction not found" — a timeout
// wearing the costume of a logic error. Raised so that a transaction fails only
// when something is genuinely wrong, not merely far away.
export const TRANSACTION_OPTIONS = {
  timeout: 20000,
  maxWait: 15000,
} as const;
