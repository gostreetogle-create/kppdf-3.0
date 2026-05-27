# UI-компоненты: Стандарты

## Standalone

- Все компоненты, директивы и пайпы — Standalone
- Никаких NgModules. Если нужна группировка — используй массив `imports`

```typescript
@Component({
  selector: 'app-my-button',
  standalone: true,
  imports: [NgIf, NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
```

## Change Detection

- Всегда `OnPush` — `ChangeDetectionStrategy.OnPush`
- Не вызывай `markForCheck()` или `detectChanges()` вручную. Signals сами триггерят обновление

## Стили: SCSS + BEM

- Никогда не используй `style:` inline
- SCSS — обязателен. Стилизация в отдельном файле `*.component.scss`
- BEM (Block__Element--Modifier) — строгий стандарт именования классов

```scss
// ✅ Правильно
.my-button {
  &__icon { margin-right: 8px; }
  &--primary { background: var(--color-primary); }
  &--disabled { opacity: 0.5; }
}

// ❌ Неправильно
.myButton { } // camelCase
.my-button_icon { } // не BEM
```

- Глобальные переменные в `src/styles/` или через CSS custom properties
- Максимум 3-4 уровня вложенности SCSS

## Dumb-компоненты (shared/ui)

- Никакой бизнес-логики
- Получают данные через `input()` / `input.required()`
- Отдают события через `output()`
- Не импортируют сервисы из `features/`

## Smart-компоненты (features, layout)

- Содержат логику: вызов сервисов, работу с состоянием
- Могут импортировать Dumb-компоненты из `shared/ui/`
- Могут импортировать сервисы из `shared/`, `core/`

## Именование

- Файлы: `kebab-case` (`my-button.component.ts`)
- Селекторы: префикс `app-` → `app-user-card`
- Классы: `PascalCase` → `UserCardComponent`
- Папки: `kebab-case` (`user-card/`)
