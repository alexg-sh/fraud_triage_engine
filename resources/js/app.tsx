import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import type { ComponentType } from 'react';

const pages = import.meta.glob('./pages/**/*.tsx', { eager: true });

createInertiaApp({
  resolve: (name) => {
    const page = pages[`./pages/${name}.tsx`] as { default: ComponentType } | undefined;

    if (!page) {
      throw new Error(`Unknown Inertia page: ${name}`);
    }

    return page.default;
  },
  setup({ el, App, props }) {
    createRoot(el).render(<App {...props} />);
  },
  progress: {
    color: '#f67b5f',
  },
});
