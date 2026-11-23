/**
 * Travel-document rules (CUS-03, CUS-04, BR-10). Pure functions, unit-tested.
 *
 *  - DOMESTIC trip: a Syrian travels with a Syrian ID (or a passport); a foreigner needs a passport
 *    plus a valid visa or residence permit for Syria.
 *  - INTERNATIONAL trip: everyone needs a passport valid N months after the trip ends; the visa is
 *    arranged by the office and tracked separately (VIS-01).
 */
export interface Doc {
  id: string;
  docType: 'SYRIAN_ID' | 'PASSPORT' | 'VISA' | 'RESIDENCE';
  expiresOn: Date | null;
  issuingCountryIso: string;
}

export interface DocCheck {
  ok: boolean;
  /** The document to print on the manifest */
  documentId: string | null;
  problems: string[];
}

const validOn = (d: Doc, date: Date) => !d.expiresOn || d.expiresOn >= date;
const addMonths = (d: Date, n: number) => {
  const r = new Date(d);
  r.setUTCMonth(r.getUTCMonth() + n);
  return r;
};

export function checkDocuments(
  person: { nationalityIso: string; fullName: string },
  docs: Doc[],
  trip: { scope: 'DOMESTIC' | 'INTERNATIONAL'; endsAt: Date; startsAt: Date },
  passportValidityMonths: number,
  home = 'SY',
): DocCheck {
  const problems: string[] = [];
  const passport = docs
    .filter((d) => d.docType === 'PASSPORT')
    .sort((a, b) => (b.expiresOn?.getTime() ?? Infinity) - (a.expiresOn?.getTime() ?? Infinity))[0];

  if (trip.scope === 'INTERNATIONAL') {
    if (!passport) return { ok: false, documentId: null, problems: [`${person.fullName}: a passport is required for travel abroad`] };
    const needed = addMonths(trip.endsAt, passportValidityMonths);
    if (!validOn(passport, needed))
      problems.push(`${person.fullName}: the passport must be valid until at least ${needed.toISOString().slice(0, 10)} (${passportValidityMonths} months after the trip)`);
    return { ok: problems.length === 0, documentId: passport.id, problems };
  }

  if (person.nationalityIso === home) {
    const id = docs.find((d) => d.docType === 'SYRIAN_ID' && validOn(d, trip.endsAt));
    if (id) return { ok: true, documentId: id.id, problems };
    if (passport && validOn(passport, trip.endsAt)) return { ok: true, documentId: passport.id, problems };
    return { ok: false, documentId: null, problems: [`${person.fullName}: a valid Syrian ID (or passport) is required`] };
  }

  // foreigner travelling inside Syria
  if (!passport || !validOn(passport, trip.endsAt)) problems.push(`${person.fullName}: a valid passport is required for a foreign national`);
  const permit = docs.find((d) => (d.docType === 'VISA' || d.docType === 'RESIDENCE') && d.issuingCountryIso === home && validOn(d, trip.endsAt));
  if (!permit) problems.push(`${person.fullName}: a valid Syrian visa or residence permit is required for a foreign national`);
  return { ok: problems.length === 0, documentId: passport?.id ?? null, problems };
}
