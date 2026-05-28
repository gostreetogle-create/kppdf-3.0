import { ApplicationConfig, provideZoneChangeDetection, provideAppInitializer, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';
import { routes } from './app.routes';
import { MessageService, ConfirmationService } from 'primeng/api';
import { authInterceptor } from './core/auth.interceptor';
import { credentialsInterceptor } from './core/credentials.interceptor';
import { AuthService } from './core/auth.service';

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
      row: {
        background: '{surface.0}',
        hoverBackground: '{surface.100}',
        stripedBackground: '{surface.50}',
      },
    },
    card: {
      root: {
        borderRadius: '12px',
        shadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
      },
      body: {
        padding: '1.25rem',
      },
    },
    button: {
      root: {
        // ⚠️ Не менять: PrimeNG preset генерирует CSS-токены на этапе сборки,
        // CSS var() здесь не работает. Фактический borderRadius берётся из
        // --kp-button-border-radius через !important в kp-button.component.scss.
        // Значение '8px' должно совпадать с --kp-radius-md в _tokens.scss.
        borderRadius: '8px',
        paddingX: '0.85rem',
        paddingY: '0.5rem',
        sm: {
          fontSize: '13px',
          paddingX: '0.75rem',
          paddingY: '0.35rem',
        },
      },
    },
    dialog: {
      root: {
        borderRadius: '16px',
        shadow: '0 12px 32px rgba(0,0,0,0.12)',
      },
      title: {
        fontSize: '16px',
        fontWeight: '600',
      },
      header: {
        padding: '1.25rem 1.5rem 0.75rem',
      },
      content: {
        padding: '0.5rem 1.5rem 1rem',
      },
    },
    tag: {
      root: {
        borderRadius: '9999px',
        padding: '0.25rem 0.75rem',
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
    provideHttpClient(withInterceptors([credentialsInterceptor, authInterceptor])),
    provideAnimationsAsync(),
    provideAppInitializer(() => {
      const authService = inject(AuthService);
      return authService.initializeAuth();
    }),
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
