const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outTs = path.join(root, 'src/app/features/quotations/quotation-editor.component.ts');
const outScss = path.join(root, 'src/app/features/quotations/quotation-editor.component.scss');

const tsBuf = execFileSync(
  'git',
  ['show', 'f74863a~1:src/app/pages/documents/document-editor.component.ts'],
  { cwd: root, maxBuffer: 10 * 1024 * 1024 },
);
const scssBuf = execFileSync(
  'git',
  ['show', 'f74863a~1:src/app/pages/documents/document-editor.component.scss'],
  { cwd: root, maxBuffer: 10 * 1024 * 1024 },
);

let s = tsBuf.toString('utf8');
s = s.replace("selector: 'app-document-editor'", "selector: 'app-quotation-editor'");
s = s.replace('export class DocumentEditorComponent', 'export class QuotationEditorComponent');
s = s.replace(
  "styleUrl: './document-editor.component.scss'",
  "styleUrl: './quotation-editor.component.scss'",
);
s = s.replace(
  "this.router.navigate(['/documents', result._id]",
  "this.router.navigate(['/quotations', result._id]",
);
s = s.replace(
  "this.router.navigate(['/documents'])",
  "this.router.navigate(['/quotations'])",
);
if (!s.includes('ChangeDetectionStrategy')) {
  s = s.replace(
    "import { Component, signal, computed, inject, OnInit } from '@angular/core';",
    "import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';",
  );
  s = s.replace('standalone: true,', 'standalone: true,\n  changeDetection: ChangeDetectionStrategy.OnPush,');
}

fs.writeFileSync(outTs, s, 'utf8');
fs.writeFileSync(outScss, scssBuf, 'utf8');
console.log('Restored quotation editor:', outTs);
