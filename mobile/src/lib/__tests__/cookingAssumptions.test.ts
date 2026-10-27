import assert from 'node:assert/strict'
import { test } from 'node:test'
import recipes from '../../../../src/domain/flipping/data/moneyMakingRecipes.js'
import { cookingAssumptions } from '../cookingAssumptions.ts'

test('karambwan disclosure accompanies the imported 1:1, 1300/h minimum-level scenario', () => {
  const row = recipes.find(r => r.id === 'mmg:Cooking raw karambwan')!
  assert.deepEqual(row.inputs, [{ id: 3142, qty: 1 }])
  assert.deepEqual(row.outputs, [{ id: 3144, qty: 1 }])
  assert.equal(row.actionsPerHour, 1300)
  assert.equal(row.skill, 'Cooking 30')
  const disclosure = cookingAssumptions(row.id)!
  assert.equal(disclosure.summary, 'Assumes no burns; guide-rate estimate.')
  assert.match(disclosure.detail, /Cooking 30 is the minimum.*not a no-burn guarantee/)
  assert.match(disclosure.detail, /equipped cooking cape prevents burns/)
  assert.match(disclosure.detail, /gauntlets do not affect karambwan/)
  assert.match(disclosure.detail, /1,300\/h.*tick-perfect normal-rate.*not your personal/)
})

test('overlay covers inspected ordinary cooking scenarios but never infers from skill or names', () => {
  const covered = recipes.filter(r => cookingAssumptions(r.id))
  // Pin the reviewed IDs and item flows: new/import-renamed methods need review.
  assert.deepEqual(covered.map(r => [r.id, r.inputs.map(i => i.id), r.outputs[0].id]), [
    ['mmg:Cooking plain pizzas', [2283, 1982, 1985], 2289],
    ['mmg:Cooking raw anchovies', [321], 319],
    ['mmg:Cooking raw anglerfish', [13439], 13441],
    ['mmg:Cooking raw chicken', [2138], 2140],
    ['mmg:Cooking raw dark crabs', [11934], 11936],
    ['mmg:Cooking raw dashing kebbit', [29107], 29134],
    ['mmg:Cooking raw herring', [345], 347],
    ['mmg:Cooking raw karambwan', [3142], 3144],
    ['mmg:Cooking raw lobster', [377], 379],
    ['mmg:Cooking raw marlin', [32349], 32352],
    ['mmg:Cooking raw monkfish', [7944], 7946],
    ['mmg:Cooking raw moonlight antelope', [29113], 29143],
    ['mmg:Cooking raw salmon', [331], 329],
    ['mmg:Cooking raw sharks', [383], 385],
    ['mmg:Cooking raw shrimp', [317], 315],
    ['mmg:Cooking raw sunlight antelope', [29116], 29140],
    ['mmg:Cooking raw swordfish', [371], 373],
    ['mmg:Cooking raw trout', [335], 333],
    ['mmg:Cooking raw tuna', [359], 361],
    ['mmg:Cooking raw yellowfin', [32325], 32328]
  ])
  for (const row of covered) {
    assert.equal(row.outputs.length, 1)
    assert.equal(row.outputs[0].qty, 1)
    assert.ok(row.source)
    assert.equal(cookingAssumptions(row.id)!.summary, 'Assumes no burns; guide-rate estimate.')
  }
  for (const id of ['mmg:Cooking plain pizzas', 'mmg:Cooking raw sharks', 'mmg:Cooking raw trout']) {
    assert.ok(covered.some(r => r.id === id))
    assert.match(cookingAssumptions(id)!.detail, /declared scenario/)
  }
  for (const id of ['mmg:Making anchovy pizzas', 'mmg:Aerial fishing', 'mmg:Cooking raw unknown fish', 'proc:Cooking raw karambwan', 'toString', '']) {
    assert.equal(cookingAssumptions(id), undefined)
  }
  for (const row of recipes.filter(r => !r.id.startsWith('mmg:Cooking '))) {
    assert.equal(cookingAssumptions(row.id), undefined)
  }
})
