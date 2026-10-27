// `--regime-report Aug-Oct=.cache/backtest/regime-gates-2026-10-26.json,...`
// writes the tables of reports/regime-gates.md (analyst notes are added by hand).

import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { BACKTEST_REPORTS_DIR } from '../../config.js'
import { type PeriodDump, choiceTable, familyTable, families, fixedTable, signalTable, summaryTable } from './report.js'

export async function loadDumps (spec: string): Promise<PeriodDump[]> {
  return Promise.all(spec.split(',').map(async part => {
    const [label, file] = part.split('=')
    if (!label || !file) throw new Error(`--regime-report expects Label=file.json,... (got "${part}")`)
    return { label, ...JSON.parse(await readFile(file, 'utf8')) } as PeriodDump
  }))
}

export function regimeTables (periods: readonly PeriodDump[]): string {
  const fams = families(periods)
  return [
    '## Signals per period (test windows)',
    signalTable(periods),
    '## Walk-forward gates vs no gate',
    summaryTable(periods),
    '## Per family',
    ...fams.map(f => familyTable(periods, f)),
    '## Fixed gates (hindsight across periods)',
    ...fams.map(f => fixedTable(periods, f)),
    '## What the folds chose',
    ...fams.map(f => choiceTable(periods, f))
  ].join('\n\n')
}

export async function regimeReportMain (spec: string, out?: string): Promise<void> {
  const periods = await loadDumps(spec)
  const file = out ?? join(BACKTEST_REPORTS_DIR, 'regime-gates.tables.md')
  await writeFile(file, `${regimeTables(periods)}\n`)
  console.error(`[regime] wrote ${file}`)
}
