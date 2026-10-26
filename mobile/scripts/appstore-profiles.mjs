#!/usr/bin/env node
// Creates and installs the App Store provisioning profiles for the app and its
// widget extension through the App Store Connect API. Additive only: never
// deletes or revokes anything. Run it again whenever Apple marks the profiles
// invalid (for example after changing the App Group on a bundle id).
//
// The App Group (group.com.gemetrics.app) itself can't be created or assigned
// through the public API. Do that once at developer.apple.com > Identifiers:
// create the group, then on both com.gemetrics.app and com.gemetrics.app.widget
// tick App Groups > Configure > group.com.gemetrics.app. Then run this.
//
// Usage:
//   GEM_ASC_KEY_ID=XXXXXXXXXX GEM_ASC_ISSUER_ID=xxxxxxxx-... node scripts/appstore-profiles.mjs
import { createSign } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const KEY_ID = process.env.GEM_ASC_KEY_ID
const ISSUER_ID = process.env.GEM_ASC_ISSUER_ID
const APP_BUNDLE_ID = 'com.gemetrics.app'
const BUNDLE_IDS = [APP_BUNDLE_ID, `${APP_BUNDLE_ID}.widget`]
const API = 'https://api.appstoreconnect.apple.com'
const PROFILE_DIRS = [
  join(homedir(), 'Library/MobileDevice/Provisioning Profiles'),
  join(homedir(), 'Library/Developer/Xcode/UserData/Provisioning Profiles')
]

if (!KEY_ID || !ISSUER_ID) {
  console.error('Set GEM_ASC_KEY_ID and GEM_ASC_ISSUER_ID.')
  process.exit(1)
}

function token () {
  const key = readFileSync(join(homedir(), `.appstoreconnect/private_keys/AuthKey_${KEY_ID}.p8`), 'utf8')
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const unsigned = `${b64({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' })}.${b64({ iss: ISSUER_ID, iat: now, exp: now + 1200, aud: 'appstoreconnect-v1' })}`
  const sig = createSign('SHA256').update(unsigned).sign({ key, dsaEncoding: 'ieee-p1363' }).toString('base64url')
  return `${unsigned}.${sig}`
}

async function api (method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(json.errors ?? json)}`)
  return json
}

async function bundleIdResource (identifier) {
  const { data } = await api('GET', `/v1/bundleIds?filter[identifier]=${encodeURIComponent(identifier)}`)
  const match = data.find(b => b.attributes.identifier === identifier)
  if (!match) throw new Error(`Bundle id ${identifier} is not registered`)
  return match.id
}

async function distributionCertificate () {
  const { data } = await api('GET', '/v1/certificates?filter[certificateType]=DISTRIBUTION&limit=200')
  const valid = data
    .filter(c => new Date(c.attributes.expirationDate) > new Date())
    .sort((a, b) => new Date(b.attributes.expirationDate) - new Date(a.attributes.expirationDate))
  if (!valid.length) throw new Error('No valid Apple Distribution certificate')
  return valid[0].id
}

function install (profile) {
  const bytes = Buffer.from(profile.attributes.profileContent, 'base64')
  for (const dir of PROFILE_DIRS) {
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, `${profile.attributes.uuid}.mobileprovision`), bytes)
  }
}

async function createProfile (identifier, certificateId) {
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
  const name = `${identifier} AppStore ${stamp}`
  const { data } = await api('POST', '/v1/profiles', {
    data: {
      type: 'profiles',
      attributes: { name, profileType: 'IOS_APP_STORE' },
      relationships: {
        bundleId: { data: { type: 'bundleIds', id: await bundleIdResource(identifier) } },
        certificates: { data: [{ type: 'certificates', id: certificateId }] }
      }
    }
  })
  install(data)
  console.log(`Installed "${name}" (${data.attributes.uuid}), state ${data.attributes.profileState}`)
}

const certificateId = await distributionCertificate()
for (const identifier of BUNDLE_IDS) await createProfile(identifier, certificateId)
