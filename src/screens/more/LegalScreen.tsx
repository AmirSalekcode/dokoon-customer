import { useState } from 'react';
import { api } from '@/api/client';
import { unwrap, useApi } from '@/api/useApi';
import { ErrorState } from '@/components/library/ErrorState';
import { FaqItem } from '@/components/library/FaqItem';
import { LoadingState } from '@/components/library/LoadingState';
import { TopBar } from '@/components/library/TopBar';
import { useNav } from '@/nav/nav';
import type { ScreenProps } from '../registry';
import s from './more.module.css';

type LegalKind = 'terms' | 'privacy';
const FALLBACK_TITLE: Record<LegalKind, string> = { terms: 'قوانین و مقررات', privacy: 'حریم خصوصی' };

export interface LegalSection {
  title: string;
  text: string;
}

/**
 * Splits a content body into sections: a line starting with «## » opens a section; text before the
 * first heading becomes an untitled lead.
 */
export function parseSections(body: string): { lead: string; sections: LegalSection[] } {
  const lead: string[] = [];
  const sections: LegalSection[] = [];
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('## ')) sections.push({ title: line.slice(3).trim(), text: '' });
    else if (sections.length) {
      const last = sections[sections.length - 1];
      last.text = last.text ? `${last.text}\n${line}` : line;
    } else lead.push(line);
  }
  return { lead: lead.join('\n'), sections };
}

/** Terms / privacy (screen-specs §6 legal): GET /content/{kind}, sections as an accordion. Draft text. */
export function LegalScreen({ route }: ScreenProps) {
  const back = useNav((st) => st.back);
  const kind: LegalKind = route.params.kind === 'privacy' ? 'privacy' : 'terms';
  const data = useApi(() => unwrap(api.GET('/content/{key}', { params: { path: { key: kind } } })), [kind]);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const title = (data.status === 'success' && data.data.title) || FALLBACK_TITLE[kind];

  const body = () => {
    if (data.status === 'loading') return <LoadingState variant="list" />;
    if (data.status === 'error') return <ErrorState onRetry={data.reload} />;
    const { lead, sections } = parseSections(data.data.body ?? '');
    return (
      <>
        <p className={s.note}>متن پیش‌نویس است و پس از بازبینی حقوقی نهایی می‌شود.</p>
        {lead ? <p className={s.desc}>{lead}</p> : null}
        {sections.map((sec, i) => (
          <FaqItem
            key={sec.title}
            q={sec.title}
            a={sec.text}
            open={openIdx === i}
            onToggle={() => setOpenIdx(openIdx === i ? null : i)}
          />
        ))}
      </>
    );
  };

  return (
    <div className={s.page}>
      <TopBar level={1} title={title} onBack={() => back()} />
      <div className={s.body}>{body()}</div>
    </div>
  );
}
