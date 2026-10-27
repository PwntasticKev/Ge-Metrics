#!/bin/sh
set -eu
cd "$(dirname "$0")"
mkdir -p target/core-tests
javac --release 11 -d target/core-tests src/main/java/com/gemetrics/recorder/Reducer.java src/test/java/com/gemetrics/recorder/ReducerTest.java
java -cp target/core-tests com.gemetrics.recorder.ReducerTest
