import { useRef, useState } from 'react';
import { backupLimit, backupText, csvText, spreadsheetRows } from '../lib/export';
import { request } from '../lib/messages';
import type { JobRecord } from '../lib/records';
import { Icon } from './Icon';

type ExportFormat = 'csv' | 'xlsx' | 'json';

function download(text: string, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function ExportControls({ onImport }: { onImport(): Promise<void> }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function run(action: () => Promise<string>) {
    setBusy(true);
    setMessage('');
    setError('');
    try { setMessage(await action()); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'The operation could not finish.'); }
    finally { setBusy(false); }
  }

  async function exportFile(format: ExportFormat) {
    await run(async () => {
      const records: JobRecord[] = [];
      let after: string | undefined;
      for (;;) {
        const page = await request('exportPage', after);
        const last = page.at(-1);
        if (!last) break;
        records.push(...page);
        after = last.id;
      }
      const filename = `job-application-tracker-${new Date().toISOString().slice(0, 10)}.${format}`;
      if (format === 'csv') download(csvText(records), filename, 'text/csv;charset=utf-8');
      if (format === 'json') download(backupText(records), filename, 'application/json');
      if (format === 'xlsx') {
        const { default: writeExcelFile } = await import('write-excel-file/browser');
        const { applications, longText } = spreadsheetRows(records);
        const data = (rows: string[][]) => rows.map((row, index) => row.map(value => ({
          type: String, value, fontWeight: index === 0 ? 'bold' as const : undefined,
        })));
        const sheets = [{ sheet: 'Applications', data: data(applications) }];
        if (longText.length > 1) sheets.push({ sheet: 'Long text', data: data(longText) });
        await writeExcelFile(sheets).toFile(filename);
      }
      return `Downloaded ${format.toUpperCase()} with ${records.length} record${records.length === 1 ? '' : 's'}.`;
    });
  }

  return <section className="panel export-panel" id="data" aria-labelledby="data-heading">
    <div className="section-heading">
      <div><h2 id="data-heading">Export and backup</h2>
        <p className="muted">Export the whole log or restore records from a tracker backup.</p></div>
    </div>
    <div className="export-body">
      <div className="export-actions">
        <button disabled={busy} onClick={() => void exportFile('csv')}><Icon name="download" size={16} />Export CSV</button>
        <button disabled={busy} onClick={() => void exportFile('xlsx')}><Icon name="download" size={16} />Export XLSX</button>
        <button disabled={busy} onClick={() => void exportFile('json')}><Icon name="download" size={16} />Back up JSON</button>
        <button disabled={busy} onClick={() => fileInput.current?.click()}><Icon name="upload" size={16} />Restore JSON</button>
      </div>
      <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={event => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        void run(async () => {
          if (file.size > backupLimit) throw new Error('Choose a tracker backup no larger than 24 MiB.');
          const result = await request('importRecords', await file.text());
          await onImport();
          return `Added ${result.added} and skipped ${result.skipped} existing or duplicate records.`;
        });
      }} />
      {busy && <p className="export-status muted" role="status">Working…</p>}
      {message && <p className="export-status" role="status"><Icon name="check" size={15} />{message}</p>}
      {error && <p className="export-status error" role="alert"><Icon name="alert" size={15} />{error}</p>}
    </div>
  </section>;
}
