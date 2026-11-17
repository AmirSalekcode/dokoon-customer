import * as D from '@/mocks/data';
import {
  requiredSatisfied,
  toFoodCardVM,
  toRestaurantCardVM,
  toggleOption,
  unitPriceWith,
  visibleGroups,
} from './viewmodels';

describe('view models', () => {
  it('formats a restaurant card in Persian (eta is display-only from restaurant)', () => {
    const vm = toRestaurantCardVM(D.restaurantCards[0]);
    expect(vm).toMatchObject({
      name: 'کباب‌سرای نقش‌جهان',
      km: '۱٫۲',
      rating: '۴٫۸',
      reviews: '۲۴۵',
      eta: '۲۵–۳۵',
      feeText: '۴۵٬۰۰۰ تومان',
      free: false,
      isOpen: true,
    });
    expect(toRestaurantCardVM(D.restaurantCards[1])).toMatchObject({ feeText: 'ارسال رایگان', free: true });
  });

  it('hides extras when the restaurant does not allow them', () => {
    const kebab = D.foods.find((f) => f.id === 'n1')!;
    expect(visibleGroups(kebab, true)).toHaveLength(1);
    expect(visibleGroups(kebab, false)).toHaveLength(0);
    expect(toFoodCardVM(kebab, { orderable: true, allowExtras: false }).hasGroups).toBe(false);
  });

  it('requires mandatory options and prices them live', () => {
    const burger = D.foods.find((f) => f.id === 'b1')!;
    const groups = visibleGroups(burger, false);
    let sel = {};
    expect(requiredSatisfied(groups, sel)).toBe(false);
    sel = toggleOption(groups[0], sel, 'm');
    expect(requiredSatisfied(groups, sel)).toBe(true);
    expect(unitPriceWith(burger, groups, sel)).toBe(280000);
    // single-choice required group switches, never empties
    sel = toggleOption(groups[0], sel, 'm');
    expect(requiredSatisfied(groups, sel)).toBe(true);
    sel = toggleOption(groups[0], sel, 'l');
    expect(unitPriceWith(burger, groups, sel)).toBe(300000);
  });

  it('multi-choice respects max', () => {
    const g = { id: 'x', max: 2, options: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] };
    let sel = toggleOption(g, {}, 'a');
    sel = toggleOption(g, sel, 'b');
    sel = toggleOption(g, sel, 'c');
    expect(sel.x).toEqual(['a', 'b']);
    sel = toggleOption(g, sel, 'a');
    expect(sel.x).toEqual(['b']);
  });
});
