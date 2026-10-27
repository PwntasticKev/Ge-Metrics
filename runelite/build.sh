#!/bin/sh
# Bounded build: six pinned jars (~10 MB), no full client/native cache or history.
set -eu
cd "$(dirname "$0")"
mkdir -p .deps
rm -rf target/classes target/test-classes
mkdir -p target/classes target/test-classes
fetch() {
  name=$1 url=$2 checksum=$3
  if ! test -f ".deps/$name.jar"; then
    curl --fail --location --silent --show-error --max-time 90 "$url" -o ".deps/$name.jar.download"
    mv ".deps/$name.jar.download" ".deps/$name.jar"
  fi
  actual=$(shasum -a 256 ".deps/$name.jar" | cut -d ' ' -f 1)
  if test "$actual" != "$checksum"; then echo "Checksum mismatch: $name" >&2; exit 1; fi
}
fetch client https://repo.runelite.net/net/runelite/client/1.13.4/client-1.13.4.jar 688ba63a7c89848c2663f3cd0b59fef42b4814b53213c6d989d4919624e95adf
fetch api https://repo.runelite.net/net/runelite/runelite-api/1.13.4/runelite-api-1.13.4.jar 9cbccbc71a86cbb5b3f314b96a4ea748fe2abd52a9f420e57949f972c271d4b4
fetch gson https://repo.maven.apache.org/maven2/com/google/code/gson/gson/2.8.5/gson-2.8.5.jar 233a0149fc365c9f6edbd683cfe266b19bdc773be98eabdaf6b3c924b48e7d81
fetch guava https://repo.maven.apache.org/maven2/com/google/guava/guava/23.2-jre/guava-23.2-jre.jar 5be9a7d05ba0ccd74708bc8018ae412255f85843c0b92302e9b9befa6ed52564
fetch guice https://repo.maven.apache.org/maven2/com/google/inject/guice/4.1.0/guice-4.1.0.jar 9b9df27a5b8c7864112b4137fd92b36c3f1395bfe57be42fedf2f520ead1a93e
fetch inject https://repo.maven.apache.org/maven2/javax/inject/javax.inject/1/javax.inject-1.jar 91c77044a50c481636c32d916fd89c9118a72195390452c81065080f957de7ff
javac --release 11 -Xlint:all,-processing -cp '.deps/*' -d target/classes src/main/java/com/gemetrics/recorder/*.java
javac --release 11 -cp 'target/classes:.deps/*' -d target/test-classes src/test/java/com/gemetrics/recorder/*.java
for test in ReducerTest JournalTest FileJournalStorageTest; do
  java -cp 'target/test-classes:target/classes:.deps/*' "com.gemetrics.recorder.$test"
done
jar --create --file target/ge-metrics-evidence-0.1.0-scaffold.jar -C target/classes . -C src/main/resources .
echo 'Built target/ge-metrics-evidence-0.1.0-scaffold.jar (no bundled dependencies)'
