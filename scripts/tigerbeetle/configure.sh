#!/usr/bin/env bash
set -euo pipefail

configure() {
    # todo; we need to update this to make sure it supports production mode too
    ./tigerbeetle format --cluster=0 --replica=0 --replica-count=1 --development ./data/0_0.tigerbeetle
}

configure