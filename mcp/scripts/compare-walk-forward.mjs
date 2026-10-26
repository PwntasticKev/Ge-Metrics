// Usage: node scripts/compare-walk-forward.mjs label=.cache/backtest/walk-forward-YYYY-MM-DD.json [...]
// Prints markdown comparison tables of fixed variants across windows.
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'

const runs = process.argv.slice(2).map(a => {
  const [label, file] = a.split('=')
  const raw = readFileSync(file)
  const j = JSON.parse(file.endsWith('.gz') ? gunzipSync(raw).toString() : raw.toString())
  return { label, j }
})
const M = v => (Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : `${Math.round(v / 1e3)}k`)
const parse = s => Object.fromEntries(s.split(' ').map(kv => kv.split('=')))
const fam = (j, name) => j.dump.find(d => d.family === name)
const find = (f, want) => f.fixed.find(v => { const p = parse(v.params); return Object.entries(want).every(([k, x]) => p[k] === String(x)) })
const sum = a => a.reduce((s, x) => s + x, 0)

function compare (name, title, variants, refIdx) {
  console.log(`\n**${name}: ${title}**\n`)
  console.log(`| Variant | ${runs.map(r => `${r.label} OOS | >0 | beats ref | losing`).join(' | ')} |`)
  console.log(`|---|${runs.map(() => '---:|---:|---:|---:').join('|')}|`)
  for (const [label, want] of variants) {
    const cells = runs.map(r => {
      const f = fam(r.j, name)
      const v = find(f, want); const ref = find(f, variants[refIdx][1])
      if (!v) return 'n/a | | |'
      const wins = v.tests.filter((x, i) => x > ref.tests[i]).length
      return `${M(sum(v.tests))} | ${v.tests.filter(x => x > 0).length}/${v.tests.length} | ${v === ref ? 'ref' : `${wins}/${v.tests.length}`} | ${v.lossPct == null ? '' : Math.round(v.lossPct * 100) + '%'}`
    })
    console.log(`| ${label} | ${cells.join(' | ')} |`)
  }
}

function summary () {
  console.log('\n**Walk-forward summary per window**\n')
  console.log('| Window | Family | WF OOS | shipped-default OOS | consensus | consensus beat default | modal choices |')
  console.log('|---|---|---:|---:|---|---:|---|')
  for (const r of runs) {
    for (const d of r.j.dump) {
      const counts = {}
      for (const o of d.folds) for (const [k, v] of Object.entries(parse(o.chosen))) { counts[k] ??= {}; counts[k][v] = (counts[k][v] ?? 0) + 1 }
      const modal = Object.entries(counts).map(([k, c]) => `${k} ${Object.entries(c).sort((a, b) => b[1] - a[1]).map(([v, n]) => `${v}:${n}`).join(' ')}`).join('; ')
      const cons = d.fixed.find(v => v.key === d.consensusKey)
      console.log(`| ${r.label} | ${d.family} | ${M(d.wf.profit)} | ${M(d.baseline.profit)} | ${cons.params} ${M(d.consensus.profit)} | ${d.consensusWins}/${d.folds.length} | ${modal} |`)
    }
  }
}

function floorWins (name, fixedKnobs, values) {
  console.log(`\n**${name}: which floor is best per test window (${Object.entries(fixedKnobs).map(([k, v]) => `${k}=${v}`).join(' ')})**\n`)
  console.log(`| Window | ${values.join(' | ')} |`)
  console.log(`|---|${values.map(() => '---:').join('|')}|`)
  for (const r of runs) {
    const f = fam(r.j, name)
    const vs = values.map(x => find(f, { ...fixedKnobs, min_volume: x }))
    const best = vs[0].tests.map((_, i) => vs.reduce((b, v, k) => (v.tests[i] > vs[b].tests[i] ? k : b), 0))
    console.log(`| ${r.label} | ${values.map((_, k) => `${best.filter(b => b === k).length}`).join(' | ')} |`)
  }
}

summary()
const mcp = (h, v, cap = true) => [`${h}h / ${v / 1000}k${cap ? '' : ' no cap'}`, { max_fill_hours: h, min_volume: v, ask_cap: cap }]
for (const name of ['plan_flips', 'top_flips']) {
  compare(name, 'fill hours at 10k, ask cap (ref = new default 2h/10k)', [mcp(2, 10000), mcp(4, 10000), mcp(8, 10000), mcp(12, 10000)], 0)
  compare(name, 'min volume at 2h, ask cap (ref = 10k)', [mcp(2, 1000), mcp(2, 5000), mcp(2, 10000), mcp(2, 25000), mcp(2, 50000)], 2)
}
compare('top_flips', 'min volume at 2h, no ask cap (ref = 10k)', [mcp(2, 1000, false), mcp(2, 5000, false), mcp(2, 10000, false), mcp(2, 25000, false), mcp(2, 50000, false)], 2)
compare('top_flips', 'old default vs new (ref = old 8h/1k)', [mcp(8, 1000), mcp(2, 10000), mcp(2, 5000)], 0)
floorWins('top_flips', { max_fill_hours: 2, ask_cap: true }, [1000, 5000, 10000, 25000, 50000])
floorWins('plan_flips', { max_fill_hours: 2, ask_cap: true }, [1000, 5000, 10000, 25000, 50000])
const app = (h, s, v = 10000) => [`h${h} s${s} ${v / 1000}k`, { horizon_hours: h, max_sell_hours: s, min_day_trades: v }]
compare('app quick', 'horizon x sell limit (ref = old default h4 s1)', [app(4, 1), app(2, 1), app(4, 0.5), app(2, 0.5), app(2, 2), app(8, 1)], 0)
compare('app quick', 'sell limit at h2 (ref = s1)', [app(2, 0.5), app(2, 1), app(2, 2), app(2, 4)], 1)
compare('app quick', 'floor at h2 s0.5 (ref = 10k)', [app(2, 0.5, 2000), app(2, 0.5, 5000), app(2, 0.5, 10000), app(2, 0.5, 25000), app(2, 0.5, 50000)], 2)
compare('app overnight', 'horizon x sell limit (ref = default h8 s1)', [app(8, 1), app(8, 0.5), app(4, 1), app(4, 0.5), app(12, 1), app(8, 2)], 0)
compare('app overnight', 'floor at h8 s1 (ref = 10k)', [app(8, 1, 2000), app(8, 1, 5000), app(8, 1, 10000), app(8, 1, 25000), app(8, 1, 50000)], 2)
compare('app dips', 'horizon x sell limit (ref = default h4 s1)', [app(4, 1), app(4, 0.5), app(8, 1), app(8, 4), app(2, 1)], 0)
compare('app dips', 'floor at h4 s1 (ref = 10k)', [app(4, 1, 2000), app(4, 1, 5000), app(4, 1, 10000), app(4, 1, 25000)], 2)

console.log('\n**Sensitivity (fixed defaults/consensus under other simulator rules)**\n')
console.log('| Window | Family | which | variant | setting | OOS | >0 |')
console.log('|---|---|---|---|---|---:|---:|')
for (const r of runs) for (const s of r.j.sensitivity) console.log(`| ${r.label} | ${s.family} | ${s.which} | ${s.label} | ${s.setting} | ${M(s.oos.profit)} | ${s.oos.foldsPositive}/${s.oos.folds} |`)
