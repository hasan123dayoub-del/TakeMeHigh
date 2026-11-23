import { checkDocuments, type Doc } from './document-rules';

const trip = (scope: 'DOMESTIC' | 'INTERNATIONAL') => ({
  scope,
  startsAt: new Date('2027-03-01'),
  endsAt: new Date('2027-03-08'),
});
const doc = (
  docType: Doc['docType'],
  expiresOn: string | null,
  issuingCountryIso = 'SY',
  id: string = docType,
): Doc => ({
  id,
  docType,
  expiresOn: expiresOn ? new Date(expiresOn) : null,
  issuingCountryIso,
});

describe('travel documents (CUS-03, CUS-04, BR-10)', () => {
  const syrian = { nationalityIso: 'SY', fullName: 'Sara' };
  const lebanese = { nationalityIso: 'LB', fullName: 'Rami' };

  it('a Syrian travels inside Syria with the Syrian ID', () => {
    expect(
      checkDocuments(syrian, [doc('SYRIAN_ID', null)], trip('DOMESTIC'), 6),
    ).toEqual({ ok: true, documentId: 'SYRIAN_ID', problems: [] });
  });

  it('a Syrian without any document is refused', () => {
    expect(checkDocuments(syrian, [], trip('DOMESTIC'), 6).ok).toBe(false);
  });

  it('a foreigner inside Syria needs a passport and a Syrian visa or residence', () => {
    expect(
      checkDocuments(
        lebanese,
        [doc('PASSPORT', '2030-01-01', 'LB')],
        trip('DOMESTIC'),
        6,
      ).problems.join(),
    ).toMatch(/visa or residence/);
    expect(
      checkDocuments(
        lebanese,
        [
          doc('PASSPORT', '2030-01-01', 'LB'),
          doc('RESIDENCE', '2028-01-01', 'SY'),
        ],
        trip('DOMESTIC'),
        6,
      ).ok,
    ).toBe(true);
  });

  it('abroad, everyone needs a passport valid N months after the trip', () => {
    expect(
      checkDocuments(
        syrian,
        [doc('SYRIAN_ID', null)],
        trip('INTERNATIONAL'),
        6,
      ).problems.join(),
    ).toMatch(/passport is required/);
    expect(
      checkDocuments(
        syrian,
        [doc('PASSPORT', '2027-05-01')],
        trip('INTERNATIONAL'),
        6,
      ).problems.join(),
    ).toMatch(/valid until at least 2027-09-08/);
    expect(
      checkDocuments(
        syrian,
        [doc('PASSPORT', '2028-01-01')],
        trip('INTERNATIONAL'),
        6,
      ),
    ).toEqual({ ok: true, documentId: 'PASSPORT', problems: [] });
  });

  it('picks the passport that lasts longest', () => {
    const r = checkDocuments(
      syrian,
      [
        doc('PASSPORT', '2027-04-01', 'SY', 'old'),
        doc('PASSPORT', '2031-01-01', 'SY', 'new'),
      ],
      trip('INTERNATIONAL'),
      6,
    );
    expect(r.documentId).toBe('new');
  });
});
