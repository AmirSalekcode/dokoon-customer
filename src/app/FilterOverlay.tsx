import { api } from '@/api/client';
import { unwrap, useApi } from '@/api/useApi';
import { FilterSheet } from '@/components/library/FilterSheet';
import { toQuery, useDiscovery, type SortKey } from '@/features/discovery/filters';
import { toFaDigits } from '@/lib/format';
import { useNav } from '@/nav/nav';

const SORTS: [SortKey, string][] = [
  ['recommended', 'پیشنهادی'],
  ['rating', 'بیشترین امتیاز'],
  ['eta', 'سریع‌ترین'],
  ['fee', 'کمترین هزینه ارسال'],
  ['distance', 'نزدیک‌ترین'],
];

/** Food-type tags (server facets). Art ids are the prototype illustrations. */
const TAGS: [string, string, string][] = [
  ['kebab', 'کباب', 'dk-kebab'],
  ['chelo', 'چلو', 'dk-chelo'],
  ['burger', 'برگر', 'dk-burger'],
  ['pizza', 'پیتزا', 'dk-pizza'],
  ['cafe', 'قهوه', 'dk-cafe'],
  ['cake', 'کیک', 'dk-cake'],
];

const RATINGS: [number, string][] = [
  [4, '۴+'],
  [4.5, '۴٫۵+'],
];

/** Shared filter sheet: edits a draft, shows the live result count, applies on confirm. */
export function FilterOverlay() {
  const { closeOverlay } = useNav.getState();
  const { draft, category, editDraft, toggleTag, clearDraft, applyDraft } = useDiscovery();
  const key = JSON.stringify(toQuery(category, draft));
  const count = useApi(
    () => unwrap(api.GET('/restaurants', { params: { query: toQuery(category, draft) } })),
    [key],
    { fullPageErrors: false },
  );

  const n = count.status === 'success' ? (count.data.items ?? []).length : null;
  const countText =
    n === null
      ? 'اعمال فیلترها'
      : n === 0
        ? 'رستورانی با این فیلترها نیست'
        : `نمایش ${toFaDigits(n)} رستوران`;

  return (
    <FilterSheet
      sort={SORTS.map(([id, label]) => ({
        id,
        label,
        selected: draft.sort === id,
        onPick: () => editDraft({ sort: id }),
      }))}
      toggles={[
        {
          id: 'open',
          title: 'باز است',
          sub: 'رستوران‌هایی که الان سفارش می‌گیرند',
          on: draft.openNow,
          onFlip: () => editDraft({ openNow: !draft.openNow }),
        },
        {
          id: 'disc',
          title: 'تخفیف‌دار',
          sub: 'رستوران‌هایی که پیشنهاد ویژه دارند',
          on: draft.hasDiscount,
          onFlip: () => editDraft({ hasDiscount: !draft.hasDiscount }),
        },
      ]}
      tags={TAGS.map(([id, label, art]) => ({
        id,
        label,
        art,
        selected: draft.tags.includes(id),
        onPick: () => toggleTag(id),
      }))}
      ratings={RATINGS.map(([v, label]) => ({
        id: String(v),
        label,
        selected: draft.minRating === v,
        onPick: () => editDraft({ minRating: draft.minRating === v ? null : v }),
      }))}
      countText={countText}
      onClear={clearDraft}
      onApply={() => {
        applyDraft();
        closeOverlay();
      }}
      onClose={closeOverlay}
    />
  );
}
