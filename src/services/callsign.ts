export function cleanCallsign(input: string): string | null {
  const value = input.trim().replace(/\s+/g, " ");
  if (value.length < 2 || value.length > 18) return null;
  if (!/^[A-Za-z0-9][A-Za-z0-9 .'-]*$/.test(value)) return null;
  return value;
}
