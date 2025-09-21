#!/usr/bin/env bash
set -euo pipefail

# Usage: ./start-tigerbeetle.sh [replica_name] [port]
# Example: ./start-tigerbeetle.sh e2e_test 6066
REPLICA_NAME=${1:-0_0}  # default to 0_0
PORT=${2:-6066}         # default to 6066
DATA_DIR=./data

start_tigerbeetle_bg() {
    local replica_file="$DATA_DIR/$REPLICA_NAME.tigerbeetle"

    if [[ ! -f "$replica_file" ]]; then
        echo "Error: replica file '$replica_file' does not exist."
        exit 1
    fi

    echo "Starting TigerBeetle replica '$replica_file' on port $PORT in background..."

    # Start in background and redirect stdout/stderr to a log file
    nohup ./tigerbeetle start \
        --addresses=$PORT \
        --development \
        "$replica_file" \
        > "$DATA_DIR/tigerbeetle_$REPLICA_NAME.log" 2>&1 &

    TB_PID=$!
    echo "TigerBeetle started with PID $TB_PID"
}

start_tigerbeetle_bg
