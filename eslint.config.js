// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const boundaries = require('eslint-plugin-boundaries');

module.exports = tseslint.config(
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

      /* ============================================================
       *  Запрет прямых импортов PrimeNG в features/ и core/
       *  PrimeNG разрешён ТОЛЬКО в shared/ (через kp-* обёртки).
       *  Исключение: primeng/api — интерфейсы/сервисы (MessageService и т.д.)
       *
       *  Используем patterns (glob), а не paths, чтобы перехватывать
       *  ВСЕ PrimeNG-модули, включая новые, без ручного обновления.
       * ============================================================ */
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['primeng/*', '!primeng/api'],
              message: 'Используйте kp-* обёртки из shared/ui/ вместо прямого импорта PrimeNG. ' +
                       'Исключение: primeng/api (сервисы/интерфейсы).',
            },
          ],
        },
      ],
    },
  },
  /* ============================================================
   *  Исключение для shared/ — PrimeNG разрешён (kp-* обёртки)
   * ============================================================ */
  {
    files: ['src/app/shared/**/*.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    files: ['src/app/app.config.ts', '**/*.spec.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  /* ============================================================
   *  Архитектурные границы (eslint-plugin-boundaries)
   *
   *  Слои зависимостей:
   *    core  →  shared  →  features  →  layout
   *          ↕              ↕
   *      externals      externals
   *
   *  Правила:
   *    - core        → только externals (@env/, @angular, rxjs и т.д.)
   *    - shared      → core + shared
   *    - feature     → core + shared (НЕ другие feature, НЕ layout)
   *    - layout      → всё
   *    - root файлы   → всё (app.component, app.config, app.routes)
   * ============================================================ */
  {
    files: ['**/*.ts'],
    plugins: {
      boundaries,
    },
    settings: {
      'boundaries/elements': [
        { type: 'core', pattern: 'src/app/core/**' },
        { type: 'shared', pattern: 'src/app/shared/**' },
        { type: 'feature', pattern: 'src/app/features/**' },
        { type: 'layout', pattern: 'src/app/layout/**' },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          /*
           * default: 'allow' — любой импорт, не подпадающий под rules,
           * считается разрешённым. Сюда попадают:
           *   - externals (@angular, primeng, rxjs и т.д.)
           *   - пути, не совпадающие ни с одним элементом (root файлы src/app/*.ts)
           *   - импорты внутри одного слоя (core → core, shared → shared)
           */
          default: 'allow',
          rules: [
            /* core: запрещены импорты из shared, feature, layout */
            {
              from: { type: 'core' },
              disallow: [{ to: { type: ['shared', 'feature', 'layout'] } }],
            },

            /* shared: запрещены импорты из feature, layout */
            {
              from: { type: 'shared' },
              disallow: [{ to: { type: ['feature', 'layout'] } }],
            },

            /*
             * feature: запрещены импорты:
             *   - из других feature (изоляция фич)
             *   - из layout
             *   Импорты внутри одного feature разрешены (self-type exception)
             */
            {
              from: { type: 'feature' },
              disallow: [{ to: { type: ['feature', 'layout'] } }],
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {
      '@angular-eslint/template/prefer-control-flow': 'off',
      '@angular-eslint/template/label-has-associated-control': 'warn',
      '@angular-eslint/template/no-negated-async': 'off',
    },
  }
);
