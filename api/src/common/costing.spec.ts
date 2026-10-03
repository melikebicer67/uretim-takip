import { laborCost, perSecondWage } from './costing.js';

describe('costing', () => {
  it('Excel saniye maaşı formülüyle aynı sonucu verir', () => {
    expect(perSecondWage(25000)).toBeCloseTo(25000 / 225 / 60 / 60, 10);
    expect(perSecondWage(45000)).toBeCloseTo(0.0555555, 6);
  });

  it('süreyi işçilik maliyetine çevirir', () => {
    expect(laborCost(36000, 3600)).toBe(160);
    expect(laborCost(25000, 0)).toBe(0);
  });
});
