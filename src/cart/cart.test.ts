import { cartCount, cartItemsTotal, lineIdOf, qtyOfFood, useCart } from './cart';

const naghsh = { id: 'naghsh', name: 'کباب‌سرای نقش‌جهان' };
const burger = { id: 'burger', name: 'برگر لاین' };
const kebab = { foodId: 'n1', title: 'کوبیده', unitPrice: 285000, options: [] };

describe('single shared cart', () => {
  beforeEach(() => useCart.getState().clear());

  it('adds and merges identical lines', () => {
    const c = useCart.getState();
    expect(c.add(naghsh, kebab)).toBe('added');
    expect(useCart.getState().add(naghsh, kebab)).toBe('added');
    const s = useCart.getState();
    expect(s.lines).toHaveLength(1);
    expect(cartCount(s)).toBe(2);
    expect(cartItemsTotal(s)).toBe(570000);
  });

  it('keeps lines with different options separate (order-independent ids)', () => {
    const c = useCart.getState();
    c.add(naghsh, {
      ...kebab,
      options: [
        { id: 'a', title: 'A', priceDelta: 1 },
        { id: 'b', title: 'B', priceDelta: 2 },
      ],
    });
    useCart.getState().add(naghsh, {
      ...kebab,
      options: [
        { id: 'b', title: 'B', priceDelta: 2 },
        { id: 'a', title: 'A', priceDelta: 1 },
      ],
    });
    useCart.getState().add(naghsh, kebab);
    expect(useCart.getState().lines).toHaveLength(2);
    expect(lineIdOf('n1', ['b', 'a'])).toBe('n1|a|b');
    expect(qtyOfFood(useCart.getState(), 'n1')).toBe(3);
  });

  it('asks for confirmation when adding from another restaurant', () => {
    useCart.getState().add(naghsh, kebab);
    const res = useCart.getState().add(burger, { foodId: 'b1', title: 'برگر', unitPrice: 1, options: [] });
    expect(res).toBe('needs-confirm');
    expect(useCart.getState().restaurant?.id).toBe('naghsh');
    expect(useCart.getState().pending?.restaurant.id).toBe('burger');
  });

  it('cancel keeps the old cart, confirm replaces it', () => {
    useCart.getState().add(naghsh, kebab);
    useCart.getState().setNote('بدون پیاز');
    useCart.getState().add(burger, { foodId: 'b1', title: 'برگر', unitPrice: 1, options: [] });
    useCart.getState().cancelPending();
    expect(useCart.getState().restaurant?.id).toBe('naghsh');
    expect(useCart.getState().pending).toBeNull();

    useCart.getState().add(burger, { foodId: 'b1', title: 'برگر', unitPrice: 1, options: [] });
    useCart.getState().confirmReplace();
    const s = useCart.getState();
    expect(s.restaurant?.id).toBe('burger');
    expect(s.lines.map((l) => l.foodId)).toEqual(['b1']);
    expect(s.note).toBe('');
  });

  it('dec to zero removes the line and frees the restaurant', () => {
    useCart.getState().add(naghsh, kebab);
    const id = useCart.getState().lines[0].lineId;
    useCart.getState().dec(id);
    expect(useCart.getState().lines).toHaveLength(0);
    expect(useCart.getState().restaurant).toBeNull();
    expect(useCart.getState().add(burger, { foodId: 'b1', title: 'برگر', unitPrice: 1, options: [] })).toBe(
      'added',
    );
  });

  it('persists to localStorage under dk-cart', () => {
    useCart.getState().add(naghsh, kebab);
    expect(JSON.parse(localStorage.getItem('dk-cart')!).lines).toHaveLength(1);
  });
});

// KAN-110: a discount that ended while the food was in the cart (server quote wins, D-66).
describe('reprice', () => {
  beforeEach(() => useCart.getState().clear());

  it('takes the server unit price and drops the old price once it is no longer lower', () => {
    useCart.getState().add(naghsh, { ...kebab, unitPrice: 270000, oldUnitPrice: 300000, qty: 2 });
    const [line] = useCart.getState().lines;
    expect(line.oldUnitPrice).toBe(300000);
    useCart.getState().reprice([{ lineId: line.lineId, unitPrice: 300000 }]);
    const after = useCart.getState().lines[0];
    expect(after).toMatchObject({ unitPrice: 300000, qty: 2 });
    expect(after.oldUnitPrice).toBeUndefined();
    expect(cartItemsTotal(useCart.getState())).toBe(600000);
  });

  it('keeps the old price while still discounted, and ignores unknown lines', () => {
    useCart.getState().add(naghsh, { ...kebab, unitPrice: 270000, oldUnitPrice: 300000 });
    const id = useCart.getState().lines[0].lineId;
    useCart.getState().reprice([
      { lineId: id, unitPrice: 280000 },
      { lineId: 'x', unitPrice: 1 },
    ]);
    expect(useCart.getState().lines).toEqual([
      expect.objectContaining({ unitPrice: 280000, oldUnitPrice: 300000 }),
    ]);
  });
});
