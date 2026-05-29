/**
 * TemplatePlaceholderService — подстановка значений в токены {{...}} шаблонов документов.
 *
 * Использует PlaceholderContext (org, client, doc, item) для resolve полей.
 * Работает с сырыми строками и с IDocumentBlock (рекурсивно: content + cells).
 */

import { Injectable } from '@angular/core';
import type { IDocumentBlock } from '../../../../shared/types/documentTemplate.interface';
import type { PlaceholderContext } from './placeholder.registry';

/** Регулярка для извлечения токенов вида {{key}} */
const TOKEN_RE = /\{\{([a-zA-Z_.]+)\}\}/g;

@Injectable({ providedIn: 'root' })
export class TemplatePlaceholderService {
  // ─────────────────────────────────────────────────────────
  // resolve() — замена всех токенов в строке
  // ─────────────────────────────────────────────────────────

  /**
   * Заменяет все токены `{{category.field}}` в шаблоне на значения из контекста.
   * Неизвестные токены остаются без изменений.
   *
   * @param template Строка с токенами, например "Поставщик: {{org.name}}"
   * @param context  Контекст с org, client, doc, item
   * @returns Строка с подставленными значениями
   */
  resolve(template: string, context: PlaceholderContext): string {
    if (!template) return '';

    return template.replace(TOKEN_RE, (_match: string, token: string) => {
      return this.resolveToken(token, context);
    });
  }

  // ─────────────────────────────────────────────────────────
  // resolveBlock() — полная обработка блока
  // ─────────────────────────────────────────────────────────

  /**
   * Разрешает все токены в блоке документа (content и cells[*].content).
   *
   * @param block   Блок шаблона с токенами
   * @param context Контекст подстановки
   * @returns Новый блок (копия) с разрешёнными токенами
   */
  resolveBlock(block: IDocumentBlock, context: PlaceholderContext): IDocumentBlock {
    const resolved: IDocumentBlock = {
      ...block,
      content: this.resolve(block.content, context),
    };

    if (block.cells && block.cells.length > 0) {
      resolved.cells = block.cells.map((cell) => ({
        ...cell,
        content: this.resolve(cell.content, context),
      }));
    }

    return resolved;
  }

  // ─────────────────────────────────────────────────────────
  // extractTokens() — извлечение токенов
  // ─────────────────────────────────────────────────────────

  /**
   * Извлекает все уникальные токены из строки.
   * Например, "{{org.name}} — {{org.inn}}" → ["org.name", "org.inn"]
   */
  extractTokens(template: string): string[] {
    if (!template) return [];

    const tokens = new Set<string>();
    let match: RegExpExecArray | null;

    // Сбрасываем lastIndex перед циклом
    TOKEN_RE.lastIndex = 0;
    while ((match = TOKEN_RE.exec(template)) !== null) {
      tokens.add(match[1]);
    }

    return Array.from(tokens).sort();
  }

  /**
   * Извлекает все уникальные токены из блока (content + cells).
   */
  extractBlockTokens(block: IDocumentBlock): string[] {
    const all = new Set<string>();

    for (const t of this.extractTokens(block.content)) {
      all.add(t);
    }

    if (block.cells) {
      for (const cell of block.cells) {
        for (const t of this.extractTokens(cell.content)) {
          all.add(t);
        }
      }
    }

    return Array.from(all).sort();
  }

  // ─────────────────────────────────────────────────────────
  // private
  // ─────────────────────────────────────────────────────────

  /**
   * Разрешает одиночный токен (без скобок) по контексту.
   * Возвращает строковое представление значения или исходный токен в `{{...}}`.
   */
  private resolveToken(token: string, ctx: PlaceholderContext): string {
    const value = this.lookup(token, ctx);
    if (value === undefined || value === null) {
      return `{{${token}}}`;
    }
    return String(value);
  }

  /**
   * Ищет значение по пути token (category.field) в контексте.
   * Например: "org.name" → ctx.org?.name
   */
  private lookup(token: string, ctx: PlaceholderContext): unknown {
    const parts = token.split('.');

    if (parts.length < 2) return undefined;

    const category = parts[0] as string;
    const field = parts.slice(1).join('.');

    switch (category) {
      case 'org':
        return ctx.org ? (ctx.org as Record<string, unknown>)[field] : undefined;
      case 'client':
        return ctx.client ? (ctx.client as Record<string, unknown>)[field] : undefined;
      case 'doc':
        return ctx.doc ? (ctx.doc as Record<string, unknown>)[field] : undefined;
      case 'item':
        return ctx.item ? (ctx.item as Record<string, unknown>)[field] : undefined;
      default:
        return undefined;
    }
  }
}
