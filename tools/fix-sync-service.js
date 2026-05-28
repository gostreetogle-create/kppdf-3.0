const fs = require('fs');
const path = require('path');

// Path to the broken file
const filePath = path.resolve(__dirname, '..', '..', 'yougile-sync-server', 'src', 'services', 'yougile-sync.service.ts');

console.log('Reading:', filePath);
const c = fs.readFileSync(filePath, 'utf8');
const lines = c.split('\n');
console.log('Total lines:', lines.length);

// Find insertion point: after "      ''" in buildTaskDescription, before "  getLastSyncAt"
const insertTarget = '  getLastSyncAt';
const idx = c.indexOf(insertTarget);
if (idx < 0) {
  console.error('ERROR: Could not find insertion target:', insertTarget);
  console.log('Last 200 chars:', JSON.stringify(c.slice(-200)));
  process.exit(1);
}

// The content to insert - rest of buildTaskDescription + logSyncEvent
const insertContent = `      '### Статус реализации',
    ];

    for (const [checklistId, done] of Object.entries(subtaskStatus)) {
      const icon = done ? '✅' : '⬜';
      const status = done ? 'выполнено' : 'не выполнено';
      lines.push(\`- \${icon} **\${checklistId}**: \${status}\`);
    }

    lines.push('');
    lines.push('---');
    lines.push(\`*Обновлено: \${new Date().toISOString().slice(0, 16).replace('T', ' ')}*\`);
    lines.push('*Источник: yougile-sync-server*');

    return lines.join('\\n');
  }

  /** Записать событие синхронизации в Google Sheets */
  private async logSyncEvent(result: SyncResult): Promise<void> {
    try {
      for (const detail of result.details) {
        const action = detail.action === 'error' ? 'error' : (detail.action === 'noop' ? 'noop' : 'update');
        await sheetsService.appendEvent({
          event_id: uuid(),
          timestamp: result.timestamp,
          source: 'poll',
          module_key: detail.module_key,
          checklist_id: '',
          task_id: detail.task_id,
          action,
          before_json: null,
          after_json: JSON.stringify({ percent: detail.percent }),
          sync_status: detail.action === 'error' ? 'failed' : 'success',
          error_message: detail.error,
        });
      }
    } catch (error) {
      logger.error('Failed to log sync event to Sheets', { error: String(error) });
    }
  }

`;

const newContent = c.slice(0, idx) + insertContent + c.slice(idx);
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('SUCCESS! New size:', newContent.length, 'bytes');

// Verify
const verify = fs.readFileSync(filePath, 'utf8');
const verifyLines = verify.split('\n');
console.log('New line count:', verifyLines.length);
console.log('Has logSyncEvent:', verify.includes('private async logSyncEvent'));
console.log('Has buildReadinessSnapshot:', verify.includes('buildReadinessSnapshot'));
console.log('Has export syncService:', verify.includes('export const syncService'));
