import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';
import { routes } from './app.routes';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AuthInterceptor } from './core/auth.interceptor';

/*
 * KPPDF 3.0 — Компактный пресет поверх Aura
 * Используются только валидные design token'ы PrimeNG.
 * Остальная кастомизация — через CSS-переменные в styles.scss.
 */
const KppdfPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554',
    },
    colorScheme: {
      light: {
        surface: {
          0: '#ffffff',
          50: '#f8f9fa',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
      },
    },
  },
  components: {
    datatable: {
      headerCell: {
        padding: '0.55rem 0.75rem',
        background: '{surface.50}',
      },
      bodyCell: {
        padding: '0.45rem 0.75rem',
      },
      row: {
        background: '{surface.0}',
        hoverBackground: '{surface.100}',
        stripedBackground: '{surface.50}',
      },
    },
    card: {
      root: {
        borderRadius: '10px',
        shadow: '0 1px 3px rgba(0,0,0,0.04)',
      },
      body: {
        padding: '1.25rem',
      },
    },
    button: {
      root: {
        borderRadius: '6px',
        paddingX: '0.75rem',
        paddingY: '0.45rem',
        sm: {
          fontSize: '13px',
          paddingX: '0.6rem',
          paddingY: '0.35rem',
        },
      },
    },
    dialog: {
      root: {
        borderRadius: '12px',
        shadow: '0 8px 32px rgba(0,0,0,0.12)',
      },
      title: {
        fontSize: '16px',
        fontWeight: '600',
      },
      header: {
        padding: '1rem 1.25rem',
      },
      content: {
        padding: '0.25rem 1.25rem 1rem',
      },
    },
    tag: {
      root: {
        borderRadius: '4px',
        padding: '0.15rem 0.5rem',
        fontSize: '12px',
        fontWeight: '500',
      },
    },
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    provideAnimationsAsync(),
    MessageService,
    ConfirmationService,
    providePrimeNG({
      theme: {
        preset: KppdfPreset,
        options: {
          darkModeSelector: false,
          cssLayer: { name: 'primeng', order: 'primeng' },
        },
      },
    }),
  ],
};
