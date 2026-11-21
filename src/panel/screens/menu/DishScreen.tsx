import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/base/Button';
import { TextField } from '@/components/base/TextField';
import { ActionBar } from '@/components/library/ActionBar';
import { EmptyState } from '@/components/library/EmptyState';
import { FilterChip } from '@/components/library/FilterChip';
import { LoadingState } from '@/components/library/LoadingState';
import { ToggleRow } from '@/components/library/ToggleRow';
import { TopBar } from '@/components/library/TopBar';
import { UploadTile } from '@/components/library/UploadTile';
import { toast } from '@/ui/toast';
import { panelApi } from '../../api/client';
import { businessError } from '../../api/errors';
import type { Food } from '../../api/types';
import { OptionGroupCard } from '../../components/OptionGroupCard';
import { showFullPageError } from '../../errors/fullPage';
import { usePanelNav } from '../../nav/nav';
import { askConfirm } from '../../shell/confirm';
import { PANEL_TOAST_MS } from '../../shell/openSwitch';
import {
  DISH_ARTS,
  dishErrors,
  draftFromFood,
  foodInput,
  groupRule,
  optionPriceText,
  useDish,
  type DishDraft,
} from '../../state/dish';
import { useMenu } from '../../state/menu';
import { useSettings } from '../../state/settings';
import { acceptAttr, PHOTO_RULE, prepareFile, uploadFile, UploadError } from '../../upload/upload';
import type { PanelScreenProps } from '../StackScreens';
import s from './menu.module.css';

const D_CAMERA = 'M4 7h3l2-3h6l2 3h3v13H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z';

function photoSub(d: DishDraft): string {
  switch (d.photo?.status) {
    case 'pending':
      return d.id ? 'در انتظار تأیید دکون' : 'بعد از ذخیره برای تأیید فرستاده می‌شود';
    case 'approved':
      return 'تأیید شد · تغییر عکس';
    case 'rejected':
      return 'رد شد · عکس دیگری بفرستید';
    default:
      return 'بارگذاری عکس واقعی';
  }
}

/** Submit an uploaded photo for review: `PUT /r/foods/{id}/photo` → pending (D-99, screen specs §3). */
async function submitPhoto(foodId: string, uploadId: string): Promise<boolean> {
  const { error } = await panelApi().PUT('/r/foods/{id}/photo', {
    params: { path: { id: foodId } },
    body: { uploadId },
  });
  if (error !== undefined) {
    toast(businessError(error)?.message ?? '', 'error', PANEL_TOAST_MS);
    return false;
  }
  const food = useMenu.getState().foods.find((f) => f.id === foodId);
  if (food) useMenu.getState().upsertFood({ ...food, photo: { status: 'pending' } });
  return true;
}

/**
 * Add / edit a dish (KAN-67): name, price, old price, description, category, default art, real photo
 * (admin review: pending → approved / rejected), availability, option groups (only with allowExtras),
 * delete with confirmation.
 */
export function DishScreen({ route }: PanelScreenProps) {
  const id = route.params.id;
  const menuStatus = useMenu((st) => st.status);
  const categories = useMenu((st) => st.categories);
  const food = useMenu((st) => (id ? st.foods.find((f) => f.id === id) : undefined));
  const owner = useDish((st) => st.owner);
  const draft = useDish((st) => (st.owner === route.key ? st.draft : null));
  const settings = useSettings((st) => st.settings);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (useMenu.getState().status === 'idle') void useMenu.getState().load();
    if (useSettings.getState().status === 'idle')
      void useSettings.getState().load(undefined, { quiet: true });
  }, []);
  // Start the draft once the food is known (or right away for a new dish).
  const ready = !id || !!food;
  useEffect(() => {
    if (ready && owner !== route.key)
      useDish.getState().start(route.key, draftFromFood(food, route.params.cat));
    // Only when the screen (route) changes; edits stay in the draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, route.key]);
  useEffect(
    () => () => {
      if (useDish.getState().owner === route.key) useDish.getState().clear();
    },
    [route.key],
  );

  const nav = usePanelNav.getState;
  const top = <TopBar title={id ? 'ویرایش غذا' : 'افزودن غذا'} onBack={() => nav().back()} />;

  if (!draft) {
    const missing = id && menuStatus === 'ready' && !food;
    return (
      <div className={s.wrap}>
        {top}
        <div className={s.body}>
          {missing ? (
            <EmptyState art="dk-all" title="غذا پیدا نشد" text="ممکن است از دستگاه دیگری حذف شده باشد." />
          ) : (
            <LoadingState variant="list" rows={3} />
          )}
        </div>
      </div>
    );
  }

  const patch = useDish.getState().patch;
  const errors = dishErrors(draft);
  const show = (k: keyof typeof errors) => (touched ? errors[k] : undefined);
  const allowExtras = settings?.allowExtras !== false;

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setUploading(true);
    try {
      const ready = await prepareFile(f, PHOTO_RULE);
      const up = await uploadFile(ready);
      if (draft.id) {
        if (await submitPhoto(draft.id, up.id)) {
          patch({ photo: { status: 'pending' } });
          toast('عکس برای تأیید دکون فرستاده شد', 'info', PANEL_TOAST_MS);
        }
      } else {
        patch({ pendingUploadId: up.id, photo: { status: 'pending' } });
        toast('عکس آماده است؛ بعد از ذخیره برای تأیید فرستاده می‌شود', 'info', PANEL_TOAST_MS);
      }
    } catch (e) {
      if (!showFullPageError(e, () => undefined))
        toast(
          e instanceof UploadError ? e.message : 'بارگذاری انجام نشد؛ اتصال را بررسی کنید',
          'error',
          PANEL_TOAST_MS,
        );
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setTouched(true);
    if (Object.keys(errors).length || saving) return;
    setSaving(true);
    try {
      const body = foodInput(draft, allowExtras);
      const api = panelApi();
      const res = draft.id
        ? await api.PUT('/r/foods/{id}', { params: { path: { id: draft.id } }, body })
        : await api.POST('/r/foods', { body });
      if (res.error !== undefined || !res.data) {
        toast(businessError(res.error)?.message ?? '', 'error', PANEL_TOAST_MS);
        return;
      }
      let saved: Food = res.data;
      if (!draft.id && draft.pendingUploadId && saved.id) {
        if (await submitPhoto(saved.id, draft.pendingUploadId))
          saved = { ...saved, photo: { status: 'pending' } };
      }
      useMenu.getState().upsertFood(saved);
      toast(draft.id ? 'تغییرات غذا ذخیره شد' : 'غذا به منو اضافه شد', 'success', PANEL_TOAST_MS);
      nav().back();
    } catch (e) {
      if (!showFullPageError(e, () => void save()))
        toast('غذا ذخیره نشد؛ دوباره تلاش کنید', 'error', PANEL_TOAST_MS);
    } finally {
      setSaving(false);
    }
  };

  const askDelete = () =>
    askConfirm({
      title: 'این غذا حذف شود؟',
      text: `«${draft.name.trim() || 'غذا'}» از منو حذف می‌شود و مشتری دیگر آن را نمی‌بیند. اگر فقط موقتاً تمام شده، «موجود است» را خاموش کنید.`,
      confirmLabel: 'حذف غذا',
      onConfirm: async () => {
        try {
          const { error } = await panelApi().DELETE('/r/foods/{id}', { params: { path: { id: draft.id! } } });
          if (error !== undefined) {
            toast(businessError(error)?.message ?? '', 'error', PANEL_TOAST_MS);
            return false;
          }
          useMenu.getState().removeFood(draft.id!);
          toast('غذا از منو حذف شد', 'info', PANEL_TOAST_MS);
          return true;
        } catch (e) {
          if (!showFullPageError(e, () => undefined))
            toast('غذا حذف نشد؛ دوباره تلاش کنید', 'error', PANEL_TOAST_MS);
          return false;
        }
      },
      after: () => nav().back(),
    });

  const askDeleteGroup = (i: number) =>
    askConfirm({
      title: 'این گروه گزینه حذف شود؟',
      text: `«${draft.groups[i]?.title ?? ''}» با همه‌ی گزینه‌هایش بعد از «ذخیره‌ی غذا» حذف می‌شود.`,
      confirmLabel: 'حذف گروه',
      onConfirm: () => {
        useDish.getState().removeGroup(i);
        return true;
      },
    });

  return (
    <div className={s.wrap}>
      {top}
      <div className={s.body}>
        <TextField
          label="نام غذا"
          value={draft.name}
          placeholder="مثلاً چلوکباب کوبیده"
          maxLength={60}
          error={show('name')}
          onChange={(v) => patch({ name: v })}
        />
        <div className={s.two}>
          <TextField
            label="قیمت"
            value={draft.price}
            numeric
            maxDigits={9}
            suffix="تومان"
            error={show('price')}
            onChange={(v) => patch({ price: v })}
          />
          <TextField
            label="قیمت قبل از تخفیف"
            value={draft.oldPrice}
            numeric
            maxDigits={9}
            suffix="تومان"
            hint="اختیاری"
            error={show('oldPrice')}
            onChange={(v) => patch({ oldPrice: v })}
          />
        </div>
        <TextField
          label="توضیح کوتاه"
          value={draft.description}
          rows={3}
          maxLength={200}
          placeholder="مواد اولیه و مقدار هر پرس"
          onChange={(v) => patch({ description: v })}
        />

        <section className={s.section} aria-labelledby="dish-cat">
          <h2 id="dish-cat" className={s.sh}>
            دسته‌بندی
          </h2>
          <div className={s.chips} role="radiogroup" aria-labelledby="dish-cat">
            {categories.map((c) => (
              <FilterChip
                key={c.id}
                label={c.label ?? ''}
                selected={draft.categoryId === c.id}
                onPick={() => patch({ categoryId: c.id ?? '' })}
              />
            ))}
          </div>
          {show('categoryId') ? <p className={s.err}>{show('categoryId')}</p> : null}
        </section>

        <section className={s.section} aria-labelledby="dish-art">
          <h2 id="dish-art" className={s.sh}>
            تصویر پیش‌فرض
          </h2>
          <div className={s.chips}>
            {DISH_ARTS.map((a) => (
              <FilterChip
                key={a.art}
                label={a.label}
                art={a.art}
                selected={draft.art === a.art}
                onPick={() => patch({ art: a.art })}
              />
            ))}
          </div>
        </section>

        <section className={s.section} aria-labelledby="dish-photo">
          <h2 id="dish-photo" className={s.sh}>
            عکس غذا
          </h2>
          <div className={s.two}>
            <UploadTile
              label="عکس غذا"
              sub={photoSub(draft)}
              d={D_CAMERA}
              done={draft.photo?.status === 'approved' || draft.photo?.status === 'pending'}
              busy={uploading}
              onTap={() => {
                const el = file.current;
                if (!el) return;
                el.value = '';
                el.click();
              }}
            />
            <p className={s.note}>
              {draft.photo?.status === 'rejected' && draft.photo.rejectReason
                ? `دلیل رد: ${draft.photo.rejectReason}. `
                : ''}
              عکس در نور روز، بدون متن و لوگو. تا تأیید دکون، تصویر پیش‌فرض به مشتری نمایش داده می‌شود.
            </p>
          </div>
          <input
            ref={file}
            type="file"
            accept={acceptAttr(PHOTO_RULE)}
            className={s.file}
            tabIndex={-1}
            aria-hidden="true"
            data-testid="dish-photo-file"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
        </section>

        <ToggleRow
          title="موجود است"
          sub="با خاموش کردن، غذا برای مشتری ناموجود نمایش داده می‌شود"
          on={draft.available}
          onFlip={() => patch({ available: !draft.available })}
        />

        <section className={s.section} aria-labelledby="dish-groups">
          <h2 id="dish-groups" className={s.sh}>
            گروه‌های گزینه و افزودنی
          </h2>
          {allowExtras ? (
            <>
              {draft.groups.map((g, i) => (
                <OptionGroupCard
                  key={g.id ?? `new-${i}`}
                  group={{
                    title: g.title ?? '',
                    required: !!g.required,
                    rule: groupRule(g),
                    options: (g.options ?? []).map((o) => ({
                      name: o.name ?? '',
                      price: optionPriceText(o.price),
                    })),
                  }}
                  onAdd={() => nav().push('group', { i: String(i), add: '1' })}
                  onEdit={() => nav().push('group', { i: String(i) })}
                  onDelete={() => askDeleteGroup(i)}
                />
              ))}
              <Button variant="secondary" onClick={() => nav().push('group')}>
                افزودن گروه گزینه
              </Button>
            </>
          ) : (
            <p className={s.warn}>
              افزودنی‌ها برای کل رستوران خاموش است. از «تنظیمات تحویل و پرداخت» در تب حساب می‌توانید آن را
              روشن کنید.
            </p>
          )}
        </section>

        {draft.id ? (
          <button type="button" className={s.danger} onClick={askDelete}>
            حذف این غذا
          </button>
        ) : null}
      </div>
      <div className={s.dock}>
        <ActionBar label="ذخیره‌ی غذا" disabled={saving || uploading} onTap={() => void save()} />
      </div>
    </div>
  );
}
