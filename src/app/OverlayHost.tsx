import { useState } from 'react';
import { useSession } from '@/auth/session';
import { displayName } from '@/auth/flow';
import { useCart } from '@/cart/cart';
import { Dialog } from '@/components/base/Dialog';
import { ChoiceSheet } from '@/components/library/ChoiceSheet';
import { MenuDrawer } from '@/components/library/MenuDrawer';
import { ReviewSheet } from '@/components/library/ReviewSheet';
import { ICONS } from '@/components/primitives/Icon';
import { formatPhone, toFaDigits } from '@/lib/format';
import { useNav } from '@/nav/nav';
import { toast } from '@/ui/toast';
import { FoodOverlay } from './FoodOverlay';
import { FilterOverlay } from './FilterOverlay';

const STAR_LABELS = ['خیلی بد', 'بد', 'معمولی', 'خوب', 'عالی'];

/** Renders the single active overlay (menu, filter, food, review, address, confirm, delconfirm, dlg). */
export function OverlayHost() {
  const overlay = useNav((st) => st.overlay);
  const { closeOverlay, push, resetTo } = useNav.getState();
  if (!overlay) return null;
  const p = overlay.props ?? {};

  switch (overlay.kind) {
    case 'menu':
      return <MenuOverlay />;
    case 'address':
      return (
        <ChoiceSheet
          title="انتخاب آدرس تحویل"
          addLabel="افزودن آدرس جدید"
          options={[
            {
              id: 'a1',
              title: 'خانه',
              sub: 'شهرضا، خیابان امام',
              icon: ICONS.home,
              selected: true,
              onPick: closeOverlay,
            },
          ]}
          onClose={closeOverlay}
          onAdd={() => push('addaddr')}
        />
      );
    case 'confirm':
      return <CartReplaceDialog />;
    case 'delconfirm':
      return (
        <Dialog
          title="آدرس «خانه» حذف شود؟"
          text="این کار قابل بازگشت نیست."
          confirmLabel="حذف آدرس"
          danger
          onConfirm={() => {
            closeOverlay();
            toast('حذف شد');
          }}
          onCancel={closeOverlay}
        />
      );
    case 'dlg':
      return (
        <Dialog
          title="خروج از حساب"
          text="برای سفارش دوباره باید با شماره‌ی موبایل وارد شوید."
          confirmLabel="خروج"
          danger
          onConfirm={() => {
            useSession.getState().clear();
            resetTo('home');
            toast('از حساب خارج شدید');
          }}
          onCancel={closeOverlay}
        />
      );
    case 'food':
      return <FoodOverlay foodId={String(p.foodId)} restaurantId={String(p.restaurantId)} />;
    case 'review':
      return <ReviewOverlay foodName={String(p.foodName ?? '')} />;
    case 'filter':
      return <FilterOverlay />;
  }
}

function MenuOverlay() {
  const { closeOverlay, push } = useNav.getState();
  const user = useSession((st) => st.user);
  const name = displayName(user?.name);
  const go = (screen: Parameters<typeof push>[0], params?: Record<string, string>) => () =>
    push(screen, params);
  return (
    <MenuDrawer
      user={{
        name,
        initial: name.slice(0, 1),
        phone: user?.phone ? formatPhone(user.phone) : 'وارد نشده‌اید',
      }}
      city="شهرضا"
      version={toFaDigits('0.1.0').replace(/\./g, '٫')}
      onClose={closeOverlay}
      groups={[
        {
          id: 'g1',
          items: [
            { id: 'invite', label: 'دعوت از دوستان', d: ICONS.user, onPick: go('invite') },
            { id: 'support', label: 'پشتیبانی و پرسش‌های متداول', d: ICONS.phone, onPick: go('support') },
          ],
        },
        {
          id: 'g2',
          items: [
            {
              id: 'apply-r',
              label: 'ثبت‌نام رستوران',
              d: ICONS.home,
              onPick: go('apply', { kind: 'restaurant' }),
            },
            { id: 'apply-c', label: 'همکاری با پیک', d: ICONS.bag, onPick: go('apply', { kind: 'courier' }) },
            { id: 'social', label: 'شبکه‌های اجتماعی', d: ICONS.share, onPick: go('social') },
            { id: 'rate', label: 'امتیاز دادن به دکون', d: ICONS.heart, onPick: go('rateapp') },
          ],
        },
      ]}
    />
  );
}

function CartReplaceDialog() {
  const { closeOverlay } = useNav.getState();
  const cart = useCart();
  return (
    <Dialog
      title="سبد خرید قبلی خالی شود؟"
      text={`سبد شما مربوط به «${cart.restaurant?.name ?? ''}» است. با افزودن از «${cart.pending?.restaurant.name ?? ''}»، سبد قبلی خالی می‌شود.`}
      confirmLabel="خالی کردن سبد و ادامه"
      dismissOnScrim={false}
      onConfirm={() => {
        cart.confirmReplace();
        closeOverlay();
        toast('به سبد خرید اضافه شد', 'success');
      }}
      onCancel={() => {
        cart.cancelPending();
        closeOverlay();
      }}
    />
  );
}

function ReviewOverlay({ foodName }: { foodName: string }) {
  const { closeOverlay } = useNav.getState();
  const [stars, setStars] = useState(0);
  const [text, setText] = useState('');
  return (
    <ReviewSheet
      foodName={foodName}
      starItems={[1, 2, 3, 4, 5].map((n) => ({
        label: `${toFaDigits(n)} ستاره`,
        on: n <= stars,
        onPick: () => setStars(n),
      }))}
      starLabel={stars ? STAR_LABELS[stars - 1] : ''}
      text={text}
      canSubmit={stars > 0}
      onText={setText}
      onSubmit={() => {
        closeOverlay();
        toast('نظر شما ثبت شد', 'success');
      }}
      onClose={closeOverlay}
    />
  );
}
