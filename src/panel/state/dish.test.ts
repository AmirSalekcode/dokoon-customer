import { describe, expect, it } from 'vitest';
import {
  dishErrors,
  draftFromFood,
  foodInput,
  groupDraft,
  groupErrors,
  groupFromDraft,
  groupRule,
  optionPriceText,
  parseToman,
  type DishDraft,
} from './dish';

// KAN-67: dish and option-group validation (screen specs §3).
const dish = (p: Partial<DishDraft> = {}): DishDraft => ({
  ...draftFromFood(undefined, 'kebab'),
  name: 'کباب',
  price: '200000',
  ...p,
});

describe('parseToman', () => {
  it('accepts Persian digits and separators', () => {
    expect(parseToman('۲۸۵٬۰۰۰')).toBe(285000);
    expect(parseToman('285,000')).toBe(285000);
    expect(parseToman('')).toBeNull();
    expect(parseToman('12a')).toBeNaN();
  });
});

describe('dishErrors', () => {
  it('a valid dish has no errors', () => {
    expect(dishErrors(dish())).toEqual({});
  });
  it('name ≥ 2, price > 0, category required', () => {
    expect(dishErrors(dish({ name: ' ک ', price: '0', categoryId: '' }))).toEqual({
      name: 'نام غذا حداقل ۲ حرف است',
      price: 'قیمت را به تومان بنویسید',
      categoryId: 'یک دسته انتخاب کنید',
    });
    expect(dishErrors(dish({ price: '' })).price).toBeDefined();
    expect(dishErrors(dish({ price: 'abc' })).price).toBeDefined();
  });
  it('old price is optional but must be above the price', () => {
    expect(dishErrors(dish({ oldPrice: '' })).oldPrice).toBeUndefined();
    expect(dishErrors(dish({ oldPrice: '0' })).oldPrice).toBeUndefined();
    expect(dishErrors(dish({ oldPrice: '۲۵۰۰۰۰' })).oldPrice).toBeUndefined();
    expect(dishErrors(dish({ oldPrice: '150000' })).oldPrice).toBe('باید از قیمت فعلی بیشتر باشد');
  });
});

describe('foodInput', () => {
  it('trims, parses prices and sends groups only with extras on', () => {
    const d = dish({
      name: ' کباب برگ ',
      price: '۳۹۵۰۰۰',
      oldPrice: '',
      groups: [{ title: 'x', options: [] }],
    });
    expect(foodInput(d, true)).toMatchObject({
      name: 'کباب برگ',
      price: 395000,
      oldPrice: 0,
      groups: [{ title: 'x' }],
    });
    expect(foodInput(d, false)).not.toHaveProperty('groups');
  });
});

describe('option groups', () => {
  it('rule text', () => {
    expect(groupRule({ required: true, max: 1 })).toBe('انتخاب ۱ مورد · اجباری');
    expect(groupRule({ required: false, max: 3 })).toBe('تا ۳ مورد · اختیاری');
    expect(optionPriceText(0)).toBe('رایگان');
    expect(optionPriceText(45000)).toBe('+۴۵٬۰۰۰ تومان');
  });

  it('needs a title and one named option; prices are numbers', () => {
    const g = groupDraft(undefined);
    expect(groupErrors(g)).toEqual({
      title: 'عنوان گروه حداقل ۲ حرف است',
      options: 'حداقل یک گزینه با نام لازم است',
    });
    g.title = 'نوشیدنی';
    g.options[0].name = 'دوغ';
    expect(groupErrors(g)).toEqual({});
    g.options[0].price = 'ده';
    expect(groupErrors(g).options).toBe('قیمت گزینه‌ها فقط عدد به تومان است');
  });

  it('drops unnamed rows; empty price = free; keeps ids', () => {
    const g = groupDraft({
      id: 'drink',
      title: 'نوشیدنی',
      required: false,
      max: 9,
      options: [{ id: 'a', name: 'دوغ', price: 25000 }],
    });
    expect(g.max).toBe(8);
    g.options.push({ key: 'x', name: '  ', price: '5' }, { key: 'y', name: 'آب', price: '' });
    expect(groupFromDraft(g)).toEqual({
      id: 'drink',
      title: 'نوشیدنی',
      required: false,
      max: 8,
      options: [
        { id: 'a', name: 'دوغ', price: 25000 },
        { name: 'آب', price: 0 },
      ],
    });
  });
});
