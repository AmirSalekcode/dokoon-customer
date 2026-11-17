import s from './InfoList.module.css';

export interface InfoListProps {
  rows: { label: string; value: string }[];
}

/** Key/value list (order info, restaurant info). */
export function InfoList({ rows }: InfoListProps) {
  return (
    <dl className={s.il}>
      {rows.map((r) => (
        <div key={r.label} className={s.r}>
          <dt>{r.label}</dt>
          <dd>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
