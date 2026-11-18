import { Component, type ReactNode } from 'react';
import { ErrorPage } from '@/components/library/ErrorPage';
import { ERROR_CONTENT } from '@/errors/errorContent';

/** Last line of defense: a render crash shows the 500 page (retry = reload), never a blank screen. */
export class AppErrorBoundary extends Component<{ children: ReactNode }, { crashed: boolean }> {
  state = { crashed: false };

  static getDerivedStateFromError() {
    return { crashed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[app] render crash', error);
  }

  render() {
    if (!this.state.crashed) return this.props.children;
    const c = ERROR_CONTENT.e500;
    return (
      <div className="app-frame" lang="fa" dir="rtl">
        <ErrorPage
          code={c.code}
          title={c.title}
          text={c.text}
          d={c.d}
          cta={c.cta}
          onPrimary={() => location.reload()}
        />
      </div>
    );
  }
}
