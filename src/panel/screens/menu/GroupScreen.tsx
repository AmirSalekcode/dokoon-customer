import { useEffect, useState } from 'react';
import { Button } from '@/components/base/Button';
import { TextField } from '@/components/base/TextField';
import { ActionBar } from '@/components/library/ActionBar';
import { ToggleRow } from '@/components/library/ToggleRow';
import { TopBar } from '@/components/library/TopBar';
import { toFaDigits } from '@/lib/format';
import { OptionEditRow } from '../../components/OptionEditRow';
import { usePanelNav } from '../../nav/nav';
import { askConfirm } from '../../shell/confirm';
import {
  blankOption,
  GROUP_MAX_MAX,
  GROUP_MAX_MIN,
  groupDraft,
  groupErrors,
  groupFromDraft,
  useDish,
  type GroupDraft,
} from '../../state/dish';
import type { PanelScreenProps } from '../StackScreens';
import s from './menu.module.css';

/**
 * Option-group editor (KAN-67): title, required, max choices (1..8), options (name + price, empty/0 =
 * free). Writes into the dish draft; the dish is saved on the server with «ذخیره‌ی غذا».
 */
export function GroupScreen({ route }: PanelScreenProps) {
  const index = route.params.i !== undefined ? Number(route.params.i) : null;
  const source = useDish((st) => (index !== null ? st.draft?.groups[index] : undefined));
  const hasDish = useDish((st) => !!st.draft);
  const [g, setG] = useState<GroupDraft>(() => {
    const d = groupDraft(source);
    return route.params.add ? { ...d, options: [...d.options, blankOption()] } : d;
  });
  const [touched, setTouched] = useState(false);
  const nav = usePanelNav.getState;

  // Nothing to edit (the dish editor is gone, or a stale index): return to it once.
  const [orphan] = useState(() => !hasDish || (index !== null && !source));
  useEffect(() => {
    if (orphan) nav().back();
  }, [orphan, nav]);

  const errors = groupErrors(g);
  const set = (p: Partial<GroupDraft>) => setG((x) => ({ ...x, ...p }));
  const setOpt = (key: string, p: { name?: string; price?: string }) =>
    setG((x) => ({ ...x, options: x.options.map((o) => (o.key === key ? { ...o, ...p } : o)) }));

  const save = () => {
    setTouched(true);
    if (Object.keys(errors).length) return;
    useDish.getState().putGroup(index, groupFromDraft(g));
    nav().back();
  };

  return (
    <div className={s.wrap}>
      <TopBar
        title={index !== null ? 'ویرایش گروه گزینه' : 'گروه گزینه‌ی تازه'}
        onBack={() => nav().back()}
      />
      <div className={s.body}>
        <TextField
          label="عنوان گروه"
          value={g.title}
          placeholder="مثلاً نوع برنج، افزودنی‌ها"
          maxLength={40}
          error={touched ? errors.title : undefined}
          onChange={(v) => set({ title: v })}
        />
        <ToggleRow
          title="انتخاب اجباری"
          sub="مشتری باید حتماً از این گروه یک گزینه انتخاب کند"
          on={g.required}
          onFlip={() => set({ required: !g.required })}
        />
        <div className={s.stepper}>
          <span id="grp-max">حداکثر تعداد انتخاب</span>
          <button
            type="button"
            aria-label="افزایش حداکثر تعداد انتخاب"
            disabled={g.max >= GROUP_MAX_MAX}
            onClick={() => set({ max: Math.min(GROUP_MAX_MAX, g.max + 1) })}
          >
            +
          </button>
          <output aria-labelledby="grp-max" aria-live="polite">
            {toFaDigits(g.max)}
          </output>
          <button
            type="button"
            aria-label="کاهش حداکثر تعداد انتخاب"
            disabled={g.max <= GROUP_MAX_MIN}
            onClick={() => set({ max: Math.max(GROUP_MAX_MIN, g.max - 1) })}
          >
            −
          </button>
        </div>

        <section className={s.section} aria-labelledby="grp-opts">
          <h2 id="grp-opts" className={s.sh}>
            گزینه‌ها و قیمت
          </h2>
          <p className={s.note}>قیمت هر گزینه به مبلغ غذا اضافه می‌شود؛ خالی یا صفر یعنی رایگان.</p>
          {g.options.map((o, i) => (
            <OptionEditRow
              key={o.key}
              index={i + 1}
              optName={o.name}
              optPrice={o.price}
              onName={(v) => setOpt(o.key, { name: v })}
              onPrice={(v) => setOpt(o.key, { price: v })}
              onDelete={() => setG((x) => ({ ...x, options: x.options.filter((y) => y.key !== o.key) }))}
            />
          ))}
          {touched && errors.options ? <p className={s.err}>{errors.options}</p> : null}
          <Button variant="secondary" onClick={() => set({ options: [...g.options, blankOption()] })}>
            افزودن گزینه
          </Button>
        </section>

        {index !== null ? (
          <button
            type="button"
            className={s.danger}
            onClick={() =>
              askConfirm({
                title: 'این گروه گزینه حذف شود؟',
                text: `«${g.title.trim() || 'گروه'}» با همه‌ی گزینه‌هایش بعد از «ذخیره‌ی غذا» حذف می‌شود.`,
                confirmLabel: 'حذف گروه',
                onConfirm: () => {
                  useDish.getState().removeGroup(index);
                  return true;
                },
                after: () => nav().back(),
              })
            }
          >
            حذف این گروه
          </button>
        ) : null}
      </div>
      <div className={s.dock}>
        <ActionBar label="ذخیره‌ی گروه" onTap={save} />
      </div>
    </div>
  );
}
