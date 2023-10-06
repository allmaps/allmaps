#!/usr/bin/env bash

cat ./input/$1.json | ../../../apps/cli/dist/index.js annotation generate
