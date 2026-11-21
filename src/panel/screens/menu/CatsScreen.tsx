import { useState } from 'react';
import { Button } from '@/components/base/Button';
import { TextField } from '@/components/base/TextField';
import { ActionBar } from '@/components/library/ActionBar';
import { TopBar } from '@/components/library/TopBar';
import { toFaDigits } from '@/lib/format';
import { toast } from '@/ui/toast';
import { usePanelNav } from '../../nav/nav';
import { catDraftErrors, foodsIn, useMenu, type CatDraft } from '../../state/menu';
import s from './menu.module.css';

let seq = 0;

/**
 * Menu categories (KAN-66): rename in place, add, delete (only an empty category). Names are saved
 * together with «ذخیره‌ی دسته‌ها»; a delete goes to the server at once.
 */
export function CatsScreen() {
  const categories = useMenu((st) => st.categories);
  const foods = useMenu((st) => st.foods);
  const [drafts, setDrafts] = useState<CatDraft[]>(() =>
    categories.map((c) => ({ key: c.id ?? '', id: c.id, label: c.label ?? '' })),
  );
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const errors = catDraftErrors(drafts);
  const old = new Map(categories.map((c) => [c.id, c.label]));
  const dirty = drafts.some((d) => !d.id || old.get(d.id) !== d.label.trim());

  const edit = (key: string, label: string) =>
    setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, label } : d)));
  const remove = async (d: CatDraft) => {
    if (!d.id) {
      setDrafts((ds) => ds.filter((x) => x.key !== d.key));
      return;
    }
    if (await useMenu.getState().deleteCategory(d.id)) setDrafts((ds) => ds.filter((x) => x.key !== d.key));
  };
  const save = async () => {
    setTouched(true);
    if (Object.keys(errors).length || saving) return;
    setSaving(true);
    const ok = await useMenu.getState().saveCategories(drafts);
    setSaving(false);
    if (ok) {
      toast('دسته‌ها ذخیره شد', 'success', 2600);
      usePanelNav.getState().back();
    }
  };

  return (
    <div className={s.wrap}>
      <TopBar title="دسته‌بندی‌های منو" onBack={() => usePanelNav.getState().back()} />
      <div className={s.body}>
        <p className={s.note}>نام دسته را مستقیم تغییر دهید. دسته‌ای که غذا دارد حذف نمی‌شود.</p>
        {drafts.map((d, i) => {
          const n = d.id ? foodsIn(foods, d.id).length : 0;
          return (
            <div key={d.key} className={s.catRow}>
              <TextField
                label={d.id ? (n ? `${toFaDigits(n)} غذا در این دسته` : 'دسته‌ی بدون غذا') : 'دسته‌ی تازه'}
                value={d.label}
                maxLength={40}
                error={touched ? errors[d.key] : undefined}
                onChange={(v) => edit(d.key, v)}
              />
              <button
                type="button"
                className={s.del}
                aria-label={`حذف دسته‌ی ${d.label.trim() || toFaDigits(i + 1)}`}
                onClick={() => void remove(d)}
              >
                حذف
              </button>
            </div>
          );
        })}
        <Button
          variant="secondary"
          onClick={() => setDrafts((ds) => [...ds, { key: `new-${++seq}`, label: '' }])}
        >
          افزودن دسته
        </Button>
      </div>
      <div className={s.dock}>
        <ActionBar label="ذخیره‌ی دسته‌ها" disabled={!dirty || saving} onTap={() => void save()} />
      </div>
    </div>
  );
}
