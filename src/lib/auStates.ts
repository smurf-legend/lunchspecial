export const AU_STATES = [
  { code: "NSW", name: "New South Wales" },
  { code: "VIC", name: "Victoria" },
  { code: "QLD", name: "Queensland" },
  { code: "WA", name: "Western Australia" },
  { code: "SA", name: "South Australia" },
  { code: "TAS", name: "Tasmania" },
  { code: "ACT", name: "Australian Capital Territory" },
  { code: "NT", name: "Northern Territory" },
] as const;

export type StateCode = (typeof AU_STATES)[number]["code"];

export const AU_STATE_CODES = AU_STATES.map((s) => s.code);

export function stateName(code: string): string {
  return AU_STATES.find((s) => s.code === code.toUpperCase())?.name ?? code;
}

export function isValidStateCode(code: string): code is StateCode {
  return AU_STATE_CODES.includes(code.toUpperCase() as StateCode);
}

// Maps the region name Vercel's edge geolocation reports (a full state/
// territory name, e.g. "New South Wales") to our state code. Falls back to
// matching against a code directly in case the header ever reports one.
export function stateCodeFromRegionName(region: string | null | undefined): StateCode | null {
  if (!region) return null;
  const trimmed = region.trim();
  const byName = AU_STATES.find((s) => s.name.toLowerCase() === trimmed.toLowerCase());
  if (byName) return byName.code;
  const byCode = AU_STATES.find((s) => s.code.toLowerCase() === trimmed.toLowerCase());
  return byCode?.code ?? null;
}
