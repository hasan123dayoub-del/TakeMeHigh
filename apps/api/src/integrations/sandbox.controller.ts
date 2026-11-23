import {
  Controller,
  Get,
  Headers,
  NotFoundException,
  Param,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../common/decorators';

/**
 * A stand-in for the three supplier platforms (hotel, transport, restaurant) until their real
 * documentation arrives (TBD-02). It speaks the generic REST contract v1 so the whole sync path
 * (adapter → items → cost-change flags) runs for real in the demo. Disable with SUPPLIER_SANDBOX=false.
 * A few prices drift a little every day, so a sync shows cost changes.
 */
const HOTEL = [
  {
    id: 'H-LTK-STD',
    name: 'فندق لاميرا اللاذقية — غرفة مزدوجة (للشخص/ليلة)',
    to: 'Latakia',
    price: 450000,
  },
  {
    id: 'H-LTK-SEA',
    name: 'فندق لاميرا اللاذقية — إطلالة بحرية (للشخص/ليلة)',
    to: 'Latakia',
    price: 620000,
  },
  {
    id: 'H-TRT-STD',
    name: 'فندق لاميرا طرطوس — غرفة مزدوجة (للشخص/ليلة)',
    to: 'Tartus',
    price: 380000,
  },
  {
    id: 'H-ALP-STD',
    name: 'فندق لاميرا حلب — غرفة مزدوجة (للشخص/ليلة)',
    to: 'Aleppo',
    price: 410000,
  },
  {
    id: 'H-DAM-STD',
    name: 'فندق لاميرا دمشق — غرفة مزدوجة (للشخص/ليلة)',
    to: 'Damascus',
    price: 520000,
  },
];
const TRANSPORT = [
  {
    id: 'T-DAM-LTK-BUS',
    name: 'دمشق ← اللاذقية — بولمان VIP',
    from: 'Damascus',
    to: 'Latakia',
    price: 200000,
    mode: 'LAND',
  },
  {
    id: 'T-LTK-DAM-BUS',
    name: 'اللاذقية ← دمشق — بولمان VIP',
    from: 'Latakia',
    to: 'Damascus',
    price: 200000,
    mode: 'LAND',
  },
  {
    id: 'T-DAM-TRT-BUS',
    name: 'دمشق ← طرطوس — بولمان',
    from: 'Damascus',
    to: 'Tartus',
    price: 170000,
    mode: 'LAND',
  },
  {
    id: 'T-TRT-DAM-BUS',
    name: 'طرطوس ← دمشق — بولمان',
    from: 'Tartus',
    to: 'Damascus',
    price: 170000,
    mode: 'LAND',
  },
  {
    id: 'T-DAM-ALP-BUS',
    name: 'دمشق ← حلب — بولمان',
    from: 'Damascus',
    to: 'Aleppo',
    price: 180000,
    mode: 'LAND',
  },
  {
    id: 'T-ALP-DAM-BUS',
    name: 'حلب ← دمشق — بولمان',
    from: 'Aleppo',
    to: 'Damascus',
    price: 180000,
    mode: 'LAND',
  },
];
const RESTAURANT = [
  {
    id: 'R-LTK-FULL',
    name: 'مطعم الشاطئ اللاذقية — باقة 3 وجبات (للشخص/يوم)',
    to: 'Latakia',
    price: 150000,
  },
  {
    id: 'R-ALP-FULL',
    name: 'مطعم الشاطئ حلب — باقة 3 وجبات (للشخص/يوم)',
    to: 'Aleppo',
    price: 130000,
  },
  {
    id: 'R-DAM-LUNCH',
    name: 'مطعم الشاطئ دمشق — غداء (للشخص)',
    to: 'Damascus',
    price: 90000,
  },
];

const DATA = {
  hotel: HOTEL,
  transport: TRANSPORT,
  restaurant: RESTAURANT,
} as const;

/** Deterministic ±3 % daily drift on every third item. */
function priceToday(base: number, index: number) {
  if (index % 3 !== 1) return base;
  const day = Math.floor(Date.now() / 86_400_000);
  const pct = ((day * 7 + index * 13) % 7) - 3; // -3..+3
  return Math.round((base * (100 + pct)) / 100 / 1000) * 1000;
}

@ApiExcludeController()
@SkipThrottle()
@Controller('sandbox/suppliers')
export class SandboxSupplierController {
  private check(kind: string, auth?: string) {
    if (process.env.SUPPLIER_SANDBOX === 'false') throw new NotFoundException();
    if (!(kind in DATA)) throw new NotFoundException();
    const key = process.env.SANDBOX_SUPPLIER_KEY || 'sandbox-demo-key';
    if (auth !== `Bearer ${key}`) throw new UnauthorizedException();
  }

  @Public()
  @Get(':kind/health')
  health(@Param('kind') kind: string, @Headers('authorization') auth?: string) {
    this.check(kind, auth);
    return { status: 'ok' };
  }

  @Public()
  @Get(':kind/items')
  items(
    @Param('kind') kind: keyof typeof DATA,
    @Headers('authorization') auth?: string,
  ) {
    this.check(kind, auth);
    return {
      items: DATA[kind].map((r, i) => ({
        id: r.id,
        name: r.name,
        from: 'from' in r ? r.from : undefined,
        to: r.to,
        price_per_person: priceToday(r.price, i).toFixed(2),
        currency: 'SYP',
        available: true,
        mode: 'mode' in r ? r.mode : undefined,
      })),
    };
  }
}
