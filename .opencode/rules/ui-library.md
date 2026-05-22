# UI-библиотека: PrimeNG + Aura + PrimeIcons

## Выбор

Используем PrimeNG v21 как основную UI-библиотеку.

| Компонент | Назначение |
|-----------|------------|
| `primeng` | UI-компоненты (таблицы, кнопки, формы, диалоги) |
| `@primeuix/themes` | Пресеты тем (Aura, Material, Lara, Nora) |
| `primeicons` | Иконки Prime |

Тема Aura — современная, минималистичная, светло-серая.

## Установка

```bash
npm install primeng @primeuix/themes primeicons
```

## Настройка

### 1. `angular.json`
```json
"styles": [
  "node_modules/primeicons/primeicons.css",
  "src/styles.scss"
]
```

### 2. `app.config.ts`
```typescript
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimationsAsync(),
    providePrimeNG({
      theme: { preset: Aura, options: { darkModeSelector: false } },
    }),
  ],
};
```

## Импорт компонентов

PrimeNG v21 — все компоненты Standalone. Импортируй напрямую:
```typescript
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
```

## Примеры

```html
<p-button label="Сохранить" icon="pi pi-check" severity="primary" />
<input pInputText id="name" [(ngModel)]="name" placeholder="Название" />
<p-table [value]="items" [paginator]="true" [rows]="10">...</p-table>
<p-dialog [(visible)]="visible" header="Редактирование" [modal]="true">...</p-dialog>
```

## Запрещено

- Использовать PrimeNG-компоненты без импорта соответствующего модуля
- Лепить BEM-классы внутрь PrimeNG-компонента
- Добавлять `primeng/resources/themes/*.css` в `angular.json` (v21 не использует CSS-темы)
