import {
  Component,
  input,
  output,
  signal,
  computed,
  ChangeDetectionStrategy,
  inject,
  DestroyRef,
} from '@angular/core';
import { NgFor, NgStyle } from '@angular/common';

import type { KpSortableDropEvent } from '../kp-sortable/kp-sortable.types';

import {
  KpSortableListDirective,
  KpSortableItemDirective,
  KpSortableHandleDirective,
  KpSplitTextCardComponent,
  KpButtonComponent,
  KpSelectComponent,
  moveSortableItems,
} from '../index';

import {
  DocCanvasMode,
  DocCanvasBlock,
  DEFAULT_BLOCK_SETTINGS,
  DOC_CANVAS_DEFAULT_BLOCKS,
  BLOCK_TEXT_COLORS,
  BLOCK_BG_COLORS,
  MAX_TEXT_CELLS,
  FALLBACK_TABLE_BLOCK_OPTIONS,
} from './kp-document-block-editor.types';

// ===== Types =====

interface EditorBlockCell {
  content: string;
  align?: 'left' | 'center' | 'right';
}

interface EditorBlock extends DocCanvasBlock {
  clientKey?: string;
  settings: {
    fontSize: number;
    fontWeight: 'normal' | 'bold' | 'semibold';
    align: 'left' | 'center' | 'right';
    color?: string;
    backgroundColor?: string;
    borderStyle?: 'none' | 'dashed' | 'solid';
    paddingTop: number;
    paddingBottom: number;
    columns?: number;
    hidden?: boolean;
  };
}

/** Сконвертировать DocCanvasBlock (IDocumentBlock) во внутренний EditorBlock с заполненными дефолтами */
function toEditorBlock(b: DocCanvasBlock): EditorBlock {
  const s = (b.settings || {}) as Record<string, unknown>;
  const d = DEFAULT_BLOCK_SETTINGS as Record<string, unknown>;
  return {
    ...b,
    settings: {
      fontSize: (s['fontSize'] ?? d['fontSize'] ?? 11) as number,
      fontWeight: (s['fontWeight'] ?? d['fontWeight'] ?? 'normal') as 'normal' | 'bold' | 'semibold',
      align: (s['align'] ?? d['align'] ?? 'center') as 'left' | 'center' | 'right',
      color: s['color'] as string | undefined,
      backgroundColor: s['backgroundColor'] as string | undefined,
      borderStyle: s['borderStyle'] as 'none' | 'dashed' | 'solid' | undefined,
      paddingTop: (s['paddingTop'] ?? d['paddingTop'] ?? 8) as number,
      paddingBottom: (s['paddingBottom'] ?? d['paddingBottom'] ?? 8) as number,
      columns: s['columns'] as number | undefined,
      hidden: s['hidden'] as boolean | undefined,
    },
  };
}

function toDocCanvasBlock(b: EditorBlock): DocCanvasBlock {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { clientKey: _ck, ...rest } = b;
  return rest as DocCanvasBlock;
}

@Component({
  selector: 'app-kp-document-block-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.kp-doc-canvas--shell]': 'isShell()',
  },
  imports: [
    NgFor,
    NgStyle,
    KpSortableListDirective,
    KpSortableItemDirective,
    KpSortableHandleDirective,
    KpSplitTextCardComponent,
    KpButtonComponent,
    KpSelectComponent,
  ],
  templateUrl: './kp-document-block-editor.component.html',
  styleUrl: './kp-document-block-editor.component.scss',
})
export class KpDocumentBlockEditorComponent {
  private readonly destroyRef = inject(DestroyRef);

  // ── Inputs ──
  readonly mode = input<DocCanvasMode>('template');
  readonly backgroundImage = input<string | undefined>(undefined);
  readonly reorderLocked = input<boolean>(false);
  readonly showAddFab = input<boolean>(true);
  readonly showBgDropzone = input<boolean>(true);
  /** Когда false — канвас отдаёт A4-оболочку + фон через ng-content, не рендерит блоки/FAB/контролы */
  readonly showBlocks = input<boolean>(true);
  readonly tableBlockOptions = input<{ label: string; value: string }[]>(FALLBACK_TABLE_BLOCK_OPTIONS);

  // ── Outputs ──
  readonly blocksChange = output<DocCanvasBlock[]>();
  readonly backgroundChange = output<string | undefined>();
  readonly blockAdded = output<DocCanvasBlock>();
  readonly blockRemoved = output<number>();
  readonly placeholderRequested = output<void>();

  // ── Internal state ──
  readonly blocks = signal<EditorBlock[]>([]);
  readonly activeBlockIndex = signal<number | null>(null);
  readonly isDraggingBlock = signal(false);
  readonly selectedTableKind = signal<string>('products');
  readonly showAddMenu = signal(false);

  // ── Computed ──
  readonly isTemplate = computed(() => this.mode() === 'template');
  readonly isShell = computed(() => !this.showBlocks());

  readonly availableTableBlockOptions = computed(() => {
    const usedKinds = new Set(
      this.blocks()
        .filter((block) => block.type === 'table')
        .map((block) => block.tableKind ?? 'products'),
    );
    return this.tableBlockOptions().filter((option) => !usedKinds.has(String(option.value ?? '')));
  });

  readonly blockTextColors = BLOCK_TEXT_COLORS;
  readonly blockBgColors = BLOCK_BG_COLORS;
  readonly maxTextCells = MAX_TEXT_CELLS;

  // ── Public API: set blocks from parent ──
  setBlocks(raw: DocCanvasBlock[], silent = false): void {
    this.blocks.set(raw.map((b) => toEditorBlock(this.withClientKey(b))));
    if (!silent) this.emitBlocksChange();
  }

  /** Вставить плейсхолдер в контент активного блока (для вызова из родителя) */
  insertPlaceholder(token: string): void {
    const idx = this.activeBlockIndex();
    if (idx === null || idx < 0 || idx >= this.blocks().length) return;
    this.blocks.update((blocks) => {
      const updated = [...blocks];
      const block = updated[idx];
      if (!block || (block.type !== 'text' && block.type !== 'header')) return blocks;
      updated[idx] = { ...block, content: (block.content ?? '') + token };
      return updated;
    });
    this.emitBlocksChange();
  }

  // ── Block drag & select ──

  onBlockDropped(event: KpSortableDropEvent<EditorBlock>): void {
    if (this.reorderLocked()) return;
    if (event.previousIndex === event.currentIndex) return;
    const len = this.blocks().length;
    if (event.previousIndex < 0 || event.currentIndex < 0 || event.previousIndex >= len || event.currentIndex >= len) {
      return;
    }
    this.blocks.update((blocks) => {
      const reordered = moveSortableItems(blocks, event);
      return reordered.map((block, order) => ({
        ...block,
        order,
        clientKey: block.clientKey ?? this.nextBlockClientKey(),
      }));
    });
    this.emitBlocksChange();
  }

  selectBlock(index: number, event: MouseEvent): void {
    if (this.isDraggingBlock()) return;
    if (!this.isTemplate()) return;
    const target = event.target as HTMLElement;
    if (target.closest('input, select, textarea, .kp-doc-canvas__table-toolbar-actions')) {
      event.stopPropagation();
      return;
    }
    event.stopPropagation();
    this.activeBlockIndex.set(index);
  }

  selectBlockKey(index: number, event: Event): void {
    event.preventDefault();
    if (this.isDraggingBlock()) return;
    if (!this.isTemplate()) return;
    this.activeBlockIndex.set(index);
  }

  onCanvasClick(): void {
    this.activeBlockIndex.set(null);
    this.showAddMenu.set(false);
  }

  onBlockDragStarted(index: number): void {
    this.isDraggingBlock.set(true);
    this.activeBlockIndex.set(index);
  }

  onBlockDragEnded(): void {
    this.isDraggingBlock.set(false);
    this.activeBlockIndex.set(null);
  }

  isBlockControlsVisible(index: number, block: EditorBlock): boolean {
    return this.isTemplate() && this.hasEditableControls(block) && this.activeBlockIndex() === index && !this.isDraggingBlock();
  }

  hasEditableControls(block: EditorBlock): boolean {
    return block.type === 'text' || block.type === 'header' || block.type === 'separator' || block.type === 'table';
  }

  stopTableBlockDrag(event: MouseEvent): void {
    event.stopPropagation();
  }

  // ── Add / Remove blocks ──

  addBlock(type: 'text' | 'separator'): void {
    const blockLen = this.blocks().length;
    const defaults = DEFAULT_BLOCK_SETTINGS;
    const newBlock: EditorBlock = {
      type,
      order: blockLen,
      content: type === 'text' ? 'Новый текст...' : '',
      settings: {
        fontSize: (defaults.fontSize ?? 11) as number,
        fontWeight: (defaults.fontWeight ?? 'normal') as 'normal' | 'bold' | 'semibold',
        align: (defaults.align ?? 'center') as 'left' | 'center' | 'right',
        color: defaults.color,
        backgroundColor: defaults.backgroundColor,
        borderStyle: type === 'text' ? 'none' : (defaults.borderStyle as 'none' | 'dashed' | 'solid' | undefined),
        paddingTop: (defaults.paddingTop ?? 8) as number,
        paddingBottom: (defaults.paddingBottom ?? 8) as number,
        columns: defaults.columns,
        hidden: defaults.hidden,
      },
    };
    if (type === 'text') {
      newBlock.title = '';
      newBlock.cells = [{ content: 'Новый текст...' }];
      newBlock.content = '';
    }
    const withKey = this.withClientKey(newBlock);
    this.blocks.update((blocks) => [...blocks, withKey]);
    this.blockAdded.emit(toDocCanvasBlock(withKey));
    this.emitBlocksChange();
  }

  addTableBlock(kind?: string): void {
    const options = this.availableTableBlockOptions();
    const selectedKind = kind ?? this.selectedTableKind();
    const option = options.find((o) => o.value === selectedKind) ?? options[0];
    if (!option) return;

    const tableKind = String(option.value ?? '');
    const newBlock: EditorBlock = {
      type: 'table',
      order: this.blocks().length,
      title: option.label,
      tableKind,
      content: '',
      settings: {
        fontSize: 10,
        fontWeight: 'normal',
        align: 'left',
        paddingTop: 8,
        paddingBottom: 8,
      },
    };
    const withKey = this.withClientKey(newBlock);
    this.blocks.update((blocks) => [...blocks, withKey]);
    this.blockAdded.emit(toDocCanvasBlock(withKey));
    this.syncSelectedTableKind();
    this.emitBlocksChange();
  }

  removeBlock(index: number): void {
    if (index < 0 || index >= this.blocks().length || this.blocks().length <= 1) return;
    this.blocks.update((blocks) => blocks.filter((_, i) => i !== index));
    if (this.activeBlockIndex() === index) {
      this.activeBlockIndex.set(null);
    } else if (this.activeBlockIndex() !== null && this.activeBlockIndex()! > index) {
      this.activeBlockIndex.update((i) => (i ?? 0) - 1);
    }
    this.blockRemoved.emit(index);
    this.emitBlocksChange();
  }

  // ── Block settings ──

  setBlockAlign(index: number, align: 'left' | 'center' | 'right'): void {
    if (!this.isValidBlockIndex(index)) return;
    this.blocks.update((blocks) => {
      const updated = [...blocks];
      const block = updated[index];
      if (!block || (block.type !== 'text' && block.type !== 'header')) return blocks;

      if (block.type === 'text') {
        const normalized = this.normalizeTextBlock(block);
        const cells = (normalized.cells ?? []).map((cell) => ({
          ...this.normalizeCell(cell, align),
          align,
        }));
        updated[index] = this.syncTextBlockContent({
          ...normalized,
          cells,
          settings: { ...normalized.settings, align },
        });
      } else {
        updated[index] = { ...block, settings: { ...block.settings, align } };
      }
      return updated;
    });
    this.emitBlocksChange();
  }

  setBlockColor(index: number, value: string): void {
    if (!this.isValidBlockIndex(index)) return;
    this.blocks.update((blocks) => {
      const updated = [...blocks];
      const block = updated[index];
      if (!block) return blocks;
      const settings = { ...block.settings };
      if (value) {
        settings.color = value;
      } else {
        delete settings.color;
      }
      updated[index] = { ...block, settings };
      return updated;
    });
    this.emitBlocksChange();
  }

  setBlockBackgroundColor(index: number, value: string): void {
    if (!this.isValidBlockIndex(index)) return;
    this.blocks.update((blocks) => {
      const updated = [...blocks];
      const block = updated[index];
      if (!block) return blocks;
      const settings = { ...block.settings };
      if (value) {
        settings.backgroundColor = value;
      } else {
        delete settings.backgroundColor;
      }
      updated[index] = { ...block, settings };
      return updated;
    });
    this.emitBlocksChange();
  }

  toggleBlockFontWeight(index: number): void {
    if (!this.isValidBlockIndex(index)) return;
    this.blocks.update((blocks) => {
      const updated = [...blocks];
      const block = updated[index];
      if (!block) return blocks;
      const next = block.settings.fontWeight === 'bold' ? 'normal' : 'bold';
      updated[index] = { ...block, settings: { ...block.settings, fontWeight: next } };
      return updated;
    });
    this.emitBlocksChange();
  }

  cycleBlockBorder(index: number): void {
    if (!this.isValidBlockIndex(index)) return;
    const order: ('none' | 'dashed' | 'solid')[] = ['none', 'dashed', 'solid'];
    this.blocks.update((blocks) => {
      const updated = [...blocks];
      const block = updated[index];
      if (!block || (block.type !== 'text' && block.type !== 'header')) return blocks;
      const current = block.settings.borderStyle ?? (block.type === 'text' ? 'dashed' : 'none');
      const next = order[(order.indexOf(current) + 1) % order.length];
      updated[index] = { ...block, settings: { ...block.settings, borderStyle: next } };
      return updated;
    });
    this.emitBlocksChange();
  }

  // ── Block style helpers ──

  blockColorActive(block: EditorBlock, value: string): boolean {
    return (block.settings.color ?? '') === value;
  }

  blockBackgroundColorActive(block: EditorBlock, value: string): boolean {
    return (block.settings.backgroundColor ?? '') === value;
  }

  blockBorderActive(block: EditorBlock): boolean {
    const style = block.settings.borderStyle ?? (block.type === 'text' ? 'dashed' : 'none');
    return style !== 'none';
  }

  blockVisualStyles(block: EditorBlock): Record<string, string> {
    const s = block.settings;
    const styles: Record<string, string> = {};
    if (s.color) {
      styles['color'] = s.color;
    }
    if (s.backgroundColor) {
      styles['background-color'] = s.backgroundColor;
    }
    const border = s.borderStyle ?? (block.type === 'text' ? 'dashed' : 'none');
    if (border === 'solid') {
      styles['border'] = '1px solid var(--kp-border)';
      styles['border-radius'] = 'var(--kp-radius-sm)';
    } else if (border === 'dashed') {
      styles['border'] = '1px dashed var(--kp-border)';
      styles['border-radius'] = 'var(--kp-radius-sm)';
    }
    return styles;
  }

  isLightSwatchColor(value: string): boolean {
    return value === '#ffffff' || value === '#fafafa' || value === '#f8fbff' || value === '#fffef5' || value === '#f8fefb';
  }

  getCells(block: EditorBlock): EditorBlockCell[] {
    return this.normalizeTextBlock(block).cells ?? [{ content: block.content }];
  }

  // ── Background ──

  readonly bgDragOver = signal(false);
  readonly bgProcessing = signal(false);

  onBgDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.bgDragOver.set(true);
  }

  onBgDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.bgDragOver.set(false);
  }

  onBgDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.bgDragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      void this.processBgFile(file);
    }
  }

  onBgFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      void this.processBgFile(file);
    }
    input.value = '';
  }

  removeBackground(): void {
    this.backgroundChange.emit(undefined);
  }

  private async processBgFile(file: File): Promise<void> {
    if (!file.type.startsWith('image/')) return;
    this.bgProcessing.set(true);
    try {
      const url = await this.fileToDataUrl(file);
      this.backgroundChange.emit(url);
    } finally {
      this.bgProcessing.set(false);
    }
  }

  private fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.readAsDataURL(file);
    });
  }

  // ── Tables (template mode — placeholder only, no items) ──

  resolveTableKind(block: EditorBlock): string {
    return block.tableKind ?? 'products';
  }

  onAddTableKindChange(value: string | number | boolean | null): void {
    if (typeof value === 'string' && value) {
      this.selectedTableKind.set(value);
    }
  }

  private syncSelectedTableKind(): void {
    const available = this.availableTableBlockOptions();
    if (available.length === 0) return;
    const current = this.selectedTableKind();
    if (!available.some((option) => option.value === current)) {
      this.selectedTableKind.set(String(available[0].value ?? 'products'));
    }
  }

  // ── TrackBy ──

  trackByBlock(index: number, block: EditorBlock): string {
    return block._id || block.clientKey || `${block.type}-${index}`;
  }

  // ── Normalizers ──

  private normalizeTextBlock(block: EditorBlock): EditorBlock {
    if (block.type !== 'text') return block;
    const fallbackAlign = block.settings.align ?? 'center';
    const settings = {
      ...block.settings,
      paddingTop: block.settings.paddingTop ?? 8,
      paddingBottom: block.settings.paddingBottom ?? 8,
    };
    if (block.settings.borderStyle === undefined) {
      settings.borderStyle = 'dashed' as const;
    }
    if (block.cells && block.cells.length > 0) {
      return {
        ...block,
        settings,
        cells: block.cells.map((cell) => this.normalizeCell(cell, fallbackAlign)),
      };
    }
    return {
      ...block,
      settings,
      cells: [{ content: block.content || '', align: fallbackAlign }],
    };
  }

  private normalizeCell(cell: EditorBlockCell, fallbackAlign: 'left' | 'center' | 'right' = 'center'): EditorBlockCell {
    return { content: cell.content ?? '', align: cell.align ?? fallbackAlign };
  }

  private syncTextBlockContent(block: EditorBlock): EditorBlock {
    if (block.type !== 'text') return block;
    const normalized = this.normalizeTextBlock(block);
    const cells = normalized.cells ?? [];
    return {
      ...normalized,
      content: cells.map((cell) => cell.content).join('\n\n') || cells[0]?.content || '',
      settings: { ...normalized.settings, columns: cells.length },
    };
  }

  private isValidBlockIndex(index: number): boolean {
    return Number.isInteger(index) && index >= 0 && index < this.blocks().length;
  }

  private emitBlocksChange(): void {
    this.blocksChange.emit(this.blocks().map(toDocCanvasBlock));
  }

  private blockKeySeq = 0;

  private nextBlockClientKey(): string {
    this.blockKeySeq += 1;
    return `b-${this.blockKeySeq}`;
  }

  private withClientKey(block: DocCanvasBlock | EditorBlock): EditorBlock {
    const b = block as EditorBlock;
    if (b.clientKey) return b;
    return { ...b, clientKey: this.nextBlockClientKey() };
  }

  // ── Initialize with default blocks ──
  initDefaultBlocks(): void {
    this.setBlocks(DOC_CANVAS_DEFAULT_BLOCKS);
  }
}
