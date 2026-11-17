const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();

/** True when what was typed is the member's name, ignoring case and stray spaces. An empty name never matches. */
export function nameMatches(typed: string, name: string): boolean {
  const expected = normalize(name);
  return expected !== '' && normalize(typed) === expected;
}
