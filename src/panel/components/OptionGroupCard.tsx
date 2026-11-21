import s from './OptionGroup.module.css';

const D_PLUS = 'M12 5v14M5 12h14';
const D_EDIT = 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4';
export const D_TRASH = 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13';

export function Glyph({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export interface OptionGroupCardProps {
  /** Pre-formatted by the parent: `rule` («تا ۳ مورد · اختیاری»), option prices («+۱۰٬۰۰۰ تومان» / «رایگان»). */
  group: { title: string; required: boolean; rule: string; options: { name: string; price: string }[] };
  onAdd: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/** Option group of a dish with add-option / edit / delete (restaurant component library). */
export function OptionGroupCard({ group, onAdd, onEdit, onDelete }: OptionGroupCardProps) {
  return (
    <section className={s.card} aria-label={`گروه ${group.title}`}>
      <div className={s.head}>
        <h3>{group.title}</h3>
        <span className={[s.tag, group.required && s.req].filter(Boolean).join(' ')}>
          {group.required ? 'اجباری' : 'اختیاری'}
        </span>
      </div>
      <p className={s.rule}>{group.rule}</p>
      <ul className={s.opts}>
        {group.options.map((o, i) => (
          <li key={i} className={s.opt}>
            <span>{o.name}</span>
            <span className={s.price}>{o.price}</span>
          </li>
        ))}
      </ul>
      <div className={s.acts}>
        <button type="button" className={s.btn} aria-label={`افزودن گزینه به ${group.title}`} onClick={onAdd}>
          <Glyph d={D_PLUS} />
          گزینه
        </button>
        <button type="button" className={s.btn} aria-label={`ویرایش گروه ${group.title}`} onClick={onEdit}>
          <Glyph d={D_EDIT} />
          ویرایش
        </button>
        <button
          type="button"
          className={[s.btn, s.danger, s.icon].join(' ')}
          aria-label={`حذف گروه ${group.title}`}
          onClick={onDelete}
        >
          <Glyph d={D_TRASH} />
        </button>
      </div>
    </section>
  );
}
