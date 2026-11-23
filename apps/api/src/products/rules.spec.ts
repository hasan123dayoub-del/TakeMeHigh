import { D } from '../common/utils/money';
import {
  assertTransition,
  bestDiscount,
  bundleTotals,
  defaultQuantity,
  distinctCoreServices,
  isOfferLive,
  lineCost,
  programErrors,
  programTotals,
  publishErrors,
  routeErrors,
  travelScope,
  tripTotals,
  type ProgramLeg,
  type RouteLine,
} from './rules';

const h = (day: number, hour: number) => new Date(Date.UTC(2027, 0, day, hour));
const frame = {
  originCityId: 'DAM',
  destinationCityId: 'ARW',
  startsAt: h(1, 6),
  endsAt: h(3, 23),
};
const leg = (
  label: string,
  from: string,
  to: string,
  s: Date,
  e: Date,
): RouteLine => ({
  label,
  serviceKind: 'TRANSPORT',
  transport: true,
  fromCityId: from,
  toCityId: to,
  startsAt: s,
  endsAt: e,
});
const stay = (
  label: string,
  city: string,
  s: Date,
  e: Date,
  kind = 'HOTEL',
): RouteLine => ({
  label,
  serviceKind: kind,
  transport: false,
  fromCityId: null,
  toCityId: city,
  startsAt: s,
  endsAt: e,
});

describe('route rules (TRP-05, TRP-06)', () => {
  it('accepts Damascus → Tartus by land then Tartus → Arwad by sea', () => {
    const lines = [
      leg('bus', 'DAM', 'TRT', h(1, 8), h(1, 12)),
      stay('hotel', 'TRT', h(1, 13), h(2, 9)),
      leg('ferry', 'TRT', 'ARW', h(2, 10), h(2, 11)),
    ];
    expect(routeErrors(frame, lines)).toEqual([]);
    expect(publishErrors(frame, lines)).toEqual([]);
  });

  it('refuses a jump between places', () => {
    const errors = routeErrors(frame, [
      leg('bus', 'DAM', 'TRT', h(1, 8), h(1, 12)),
      leg('ferry', 'LTK', 'ARW', h(1, 13), h(1, 14)),
    ]);
    expect(errors.join()).toMatch(/must depart from where "bus" arrives/);
  });

  it('refuses overlapping legs and overlapping hotel stays', () => {
    expect(
      routeErrors(frame, [
        leg('a', 'DAM', 'TRT', h(1, 8), h(1, 12)),
        leg('b', 'TRT', 'ARW', h(1, 11), h(1, 13)),
      ]).join(),
    ).toMatch(/starts before "a" arrives/);
    expect(
      routeErrors(frame, [
        stay('h1', 'DAM', h(1, 8), h(2, 9)),
        stay('h2', 'DAM', h(2, 8), h(3, 9)),
      ]).join(),
    ).toMatch(/overlaps/);
  });

  it('keeps every service inside the trip dates and on the route', () => {
    expect(
      routeErrors(frame, [stay('late', 'ARW', h(3, 20), h(4, 9))]).join(),
    ).toMatch(/within the trip dates/);
    expect(
      routeErrors(frame, [stay('elsewhere', 'ALP', h(1, 9), h(1, 10))]).join(),
    ).toMatch(/not on the trip route/);
  });

  it('needs two different services to publish (BR-04) and a route from the origin to the destination', () => {
    expect(
      publishErrors(frame, [
        leg('bus', 'DAM', 'ARW', h(1, 8), h(1, 12)),
      ]).join(),
    ).toMatch(/at least two different services/);
    const wrongStart = [
      leg('bus', 'TRT', 'ARW', h(1, 8), h(1, 12)),
      stay('hotel', 'ARW', h(1, 13), h(2, 9)),
    ];
    expect(publishErrors(frame, wrongStart).join()).toMatch(
      /leave from the trip origin/,
    );
  });

  it('counts distinct core services only', () => {
    expect(distinctCoreServices(['HOTEL', 'HOTEL', 'OTHER'])).toBe(1);
    expect(distinctCoreServices(['HOTEL', 'TRANSPORT', 'RESTAURANT'])).toBe(3);
  });
});

describe('program rules (PGM-02, PGM-05)', () => {
  const t = (
    id: string,
    from: string,
    to: string,
    s: Date,
    e: Date,
    extra: Partial<ProgramLeg> = {},
  ): ProgramLeg => ({
    id,
    code: id,
    originCityId: from,
    destinationCityId: to,
    startsAt: s,
    endsAt: e,
    registrationDeadline: h(1, 0),
    currencyCode: 'USD',
    status: 'OPEN',
    ...extra,
  });

  it('chains Damascus → Mecca → Medina → Damascus', () => {
    const legs = [
      t('U1', 'DAM', 'MKK', h(5, 6), h(9, 9)),
      t('U2', 'MKK', 'MED', h(9, 9), h(12, 7)),
      t('U3', 'MED', 'DAM', h(12, 8), h(12, 21)),
    ];
    expect(programErrors(legs, h(1, 0))).toEqual([]);
  });

  it('refuses gaps in place, overlaps in time, mixed currencies and late deadlines', () => {
    const errors = programErrors(
      [
        t('A', 'DAM', 'TRT', h(5, 6), h(6, 9)),
        t('B', 'LTK', 'ARW', h(6, 8), h(6, 20), { currencyCode: 'SYP' }),
      ],
      h(2, 0),
    ).join('|');
    expect(errors).toMatch(/B must leave from where A ends/);
    expect(errors).toMatch(/B starts before A ends/);
    expect(errors).toMatch(/same currency/);
    expect(errors).toMatch(/deadline cannot be after/);
  });

  it('needs at least two trips', () => {
    expect(
      programErrors([t('A', 'DAM', 'TRT', h(5, 6), h(6, 9))], h(1, 0)).join(),
    ).toMatch(/at least two trips/);
  });
});

describe('pricing (PRC-03..05, B.6)', () => {
  it('prices the coach example: 200,000 net + 15 % = 230,000', () => {
    const totals = tripTotals([
      { costSnapshot: '200000', sellingPrice: '230000' },
      { costSnapshot: '1350000', sellingPrice: '1620000' },
    ]);
    expect(totals).toEqual({
      costPerPerson: '1550000.00',
      pricePerPerson: '1850000.00',
    });
  });

  it('multiplies the unit cost by nights / days', () => {
    expect(defaultQuantity('HOTEL', h(1, 14), h(4, 11))).toBe(3);
    expect(defaultQuantity('RESTAURANT', h(1, 13), h(4, 12))).toBe(4);
    expect(defaultQuantity('TRANSPORT', h(1, 8), h(1, 12))).toBe(1);
    expect(lineCost('450000', 3).toFixed(2)).toBe('1350000.00');
  });

  it('sums program prices from its trips (no extra profit)', () => {
    expect(
      programTotals([
        { costPerPerson: '100', pricePerPerson: '120' },
        { costPerPerson: '50.50', pricePerPerson: '70.25' },
      ]),
    ).toEqual({ costPerPerson: '150.50', pricePerPerson: '190.25' });
  });

  it('applies a bundle discount without going below zero', () => {
    const t = bundleTotals(
      [
        { costSnapshot: '1000', sellingPrice: '1200' },
        { costSnapshot: '200', sellingPrice: '250' },
      ],
      'PERCENT',
      '15',
    );
    expect(t).toEqual({
      costPerPerson: '1200.00',
      grossPerPerson: '1450.00',
      discountPerPerson: '217.50',
      pricePerPerson: '1232.50',
    });
    expect(
      bundleTotals([{ costSnapshot: '10', sellingPrice: '12' }], 'FIXED', '50')
        .pricePerPerson,
    ).toBe('0.00');
  });

  it('never stacks discounts: the best live one wins (OFR-03)', () => {
    const now = new Date('2027-01-10T12:00:00Z');
    const base = {
      validFrom: new Date('2027-01-01'),
      validTo: new Date('2027-01-31'),
      isActive: true,
    };
    const best = bestDiscount(
      '1000',
      [
        {
          ...base,
          id: 'p10',
          title: '10%',
          discountMode: 'PERCENT',
          discountValue: '10',
        },
        {
          ...base,
          id: 'f150',
          title: '150',
          discountMode: 'FIXED',
          discountValue: '150',
        },
        {
          ...base,
          id: 'expired',
          title: '50%',
          discountMode: 'PERCENT',
          discountValue: '50',
          validTo: new Date('2027-01-05'),
        },
      ],
      now,
    );
    expect(best?.offer.id).toBe('f150');
    expect(D(best!.amount).toFixed(2)).toBe('150.00');
    expect(isOfferLive({ ...base, isActive: false }, now)).toBe(false);
  });
});

describe('lifecycle and scope', () => {
  it('allows only the B.5 transitions', () => {
    expect(assertTransition('DRAFT', 'OPEN')).toBeNull();
    expect(assertTransition('CLOSED', 'CONFIRMED')).toBeNull();
    expect(assertTransition('COMPLETED', 'OPEN')).toMatch(/Cannot move/);
    expect(assertTransition('DRAFT', 'CLOSED')).toMatch(/Cannot move/);
  });

  it('derives domestic vs international from the countries (TRP-02)', () => {
    expect(travelScope(['SY', 'SY'])).toBe('DOMESTIC');
    expect(travelScope(['SY', 'SA'])).toBe('INTERNATIONAL');
  });
});
