// Romanian Personal Numeric Code (CNP) utilities

const CONTROL_WEIGHTS = [2, 7, 9, 1, 4, 6, 3, 5, 8, 2, 7, 9];

// County codes: 01-52 (plus 70 for the unified post-SIRUTA code)
const VALID_COUNTIES = new Set<number>([
  ...Array.from({ length: 52 }, (_, i) => i + 1),
  70,
]);

function computeControlDigit(cnp: string): number {
  const sum = CONTROL_WEIGHTS.reduce((acc, w, i) => acc + w * Number(cnp[i]), 0);
  const r = sum % 11;
  return r < 10 ? r : 1;
}

export interface CNPParseResult {
  valid: boolean;
  sex?: "Male" | "Female";
  dateOfBirth?: string; // ISO yyyy-MM-dd
  county?: number;
  error?: string;
}

export function parseCNP(cnp: string): CNPParseResult {
  if (!/^\d{13}$/.test(cnp)) {
    return { valid: false, error: "CNP must be exactly 13 digits." };
  }

  const s = Number(cnp[0]);
  const aa = Number(cnp.slice(1, 3));
  const ll = Number(cnp.slice(3, 5));
  const zz = Number(cnp.slice(5, 7));
  const jj = Number(cnp.slice(7, 9));
  const nnn = Number(cnp.slice(9, 12));
  const c = Number(cnp[12]);

  if (s < 1 || s > 8) return { valid: false, error: "Invalid sex/century digit (S must be 1–8)." };

  const sex: "Male" | "Female" = s % 2 === 1 ? "Male" : "Female";

  let centuryBase: number;
  if (s === 1 || s === 2) centuryBase = 1900;
  else if (s === 3 || s === 4) centuryBase = 1800;
  else if (s === 5 || s === 6) centuryBase = 2000;
  else centuryBase = 1900; // residents (7, 8) — century ambiguous, default 1900

  const year = centuryBase + aa;

  if (ll < 1 || ll > 12) return { valid: false, error: "Invalid birth month (LL must be 01–12)." };
  if (zz < 1 || zz > 31) return { valid: false, error: "Invalid birth day (ZZ must be 01–31)." };

  // Verify the day exists in that month/year
  const daysInMonth = new Date(year, ll, 0).getDate();
  if (zz > daysInMonth) {
    return { valid: false, error: `Day ${zz} does not exist in month ${ll}/${year}.` };
  }

  if (!VALID_COUNTIES.has(jj)) {
    return { valid: false, error: `Invalid county code (JJ = ${String(jj).padStart(2, "0")}).` };
  }

  if (nnn < 1) return { valid: false, error: "Sequence number NNN must be 001–999." };

  const expected = computeControlDigit(cnp);
  if (c !== expected) {
    return { valid: false, error: `Invalid control digit (expected ${expected}, got ${c}).` };
  }

  const month = String(ll).padStart(2, "0");
  const day = String(zz).padStart(2, "0");

  return {
    valid: true,
    sex,
    dateOfBirth: `${year}-${month}-${day}`,
    county: jj,
  };
}

/** Zod-compatible refinement — call this inside `.refine()`. */
export function isValidCNP(cnp: string): boolean {
  return parseCNP(cnp).valid;
}
