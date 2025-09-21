#!/usr/bin/env bash
set -euo pipefail

# Usage: ./setup-tigerbeetle.sh [replica_name]
# Example: ./setup-tigerbeetle.sh e2e_test
REPLICA_NAME=${1:-0_0}   # default to 0_0
DATA_DIR=./data

configure() {
    local replica_file="$DATA_DIR/$REPLICA_NAME.tigerbeetle"

    # Ensure data directory exists
    mkdir -p "$DATA_DIR"

    # Remove existing replica file if it exists
    if [[ -f "$replica_file" ]]; then
        echo "Removing existing replica file: $replica_file"
        rm "$replica_file"
    fi

    echo "Configuring TigerBeetle replica: $replica_file"
    
    ./tigerbeetle format \
        --cluster=0 \
        --replica=0 \
        --replica-count=1 \
        --development \
        "$replica_file"
}

configure