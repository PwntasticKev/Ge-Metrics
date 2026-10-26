// AGENT_DEVICE_BIN=<launcher from device_open> node scripts/smoke-exit-rehearsal.mjs
//   <all --platform/--udid/--config/--session flags returned by device_open>
// Uses live data; verifies navigation, rendering and horizon interaction,
// not unstable price values. Pure analytics and missing-data cases have unit tests.
import { execFileSync } from 'node:child_process'
import assert from 'node:assert/strict'
const bin = process.env.AGENT_DEVICE_BIN
const flags = process.argv.slice(2)
assert.ok(bin && flags.length, 'Set AGENT_DEVICE_BIN and pass the device_open target flags')
const run = (...args) => execFileSync(bin, [...args, ...flags], { encoding: 'utf8', timeout: 120_000 })
run('open', 'com.gemetrics.app', 'gemetrics:///?item=27616')
run('scroll', 'down', '--until', 'text="Exit rehearsal"')
let tree = run('snapshot', '-i')
assert.match(tree, /Exit rehearsal/)
assert.match(tree, /Break-even sale after tax/)
for (const label of ['4h', '8h', '2h']) {
  const ref = tree.match(new RegExp(`(@e\\d+)[^\\n]* "${label}"`))?.[1]
  assert.ok(ref, `Missing ${label} selector`)
  run('click', ref)
  tree = run('snapshot', '-i')
  assert.match(tree, new RegExp(`"${label}"[^\\n]*\\[selected\\]`))
  assert.match(tree, /Exit rehearsal/)
}
console.log('Exit rehearsal: opens from item link, renders, and all horizons respond')
