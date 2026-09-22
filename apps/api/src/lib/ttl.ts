const UNITS: Record<string, number> = {
  ms: 0.001,
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
  w: 604800,
  y: 31536000,
};

export function parseRefreshTokenTtl(ttl: string): number {
  const match = ttl.match(/^(\d+(?:\.\d+)?)\s?(ms|s|m|h|d|w|y)?$/);
  if (!match) throw new Error(`Invalid TTL: ${ttl}`);
  const value = parseFloat(match[1]);
  const unit = match[2] ?? "s";
  return Math.floor(value * UNITS[unit]);
}
