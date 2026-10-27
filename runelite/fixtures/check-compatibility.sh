#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."
"${NODE:-node}" -e 'if (+process.versions.node.split(".")[0] !== 24) throw Error("Node 24 required; set NODE to its executable")'
./runelite/build.sh
"${NODE:-node}" --test runelite/src/test/export-compatibility.test.ts mobile/src/lib/__tests__/runeliteEvidence.test.ts
