# Angular 21+ Signals & TypeScript Rules

## Signals API

- **`input()` / `input.required()`** — входные параметры компонента
- **`output()`** — события наружу, всегда типизированы: `output<MyEventType>()`
- **`signal()`** — внутреннее реактивное состояние
- **`computed()`** — производные значения, чистые функции без сайд-эффектов
- **`effect()`** — только для отладки или интеграции с внешними API

## Строгая типизация

- **`any` запрещён.** Используй `unknown` с гардовой проверкой
- Все модели — интерфейсы с чёткими полями
- `Partial<T>`, `Pick<T>`, `Omit<T>` — только когда необходимо

## Dependency Injection

- Только `inject()` — никакого constructor DI
- Порядок: сначала `inject()`, затем `signal()`/`computed()`, затем логика

```typescript
// ✅ Правильно
export class MyService {
  private readonly http = inject(HttpClient);
  readonly items = toSignal(this.http.get<Item[]>(API_URL), { initialValue: [] });
}

// ❌ Неправильно
export class MyService {
  constructor(private http: HttpClient) {}
}
```

## RxJS

- RxJS — только для HTTP и внешних событий
- Если можно через `signal()` + `computed()` — не используй RxJS
- Конвертация: `toSignal(obs$, { initialValue: null })`

## Readonly

- Экспортируемые `signal()` / `computed()` — в `asReadonly()`

```typescript
private readonly _count = signal(0);
readonly count = this._count.asReadonly();
```
