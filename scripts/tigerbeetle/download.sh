#!/usr/bin/env bash
set -euo pipefail

##
# download:
#   Downloads and extracts the TigerBeetle binary for the current OS and architecture.
#
#   Usage:
#       download <version>
#
#   Example:
#       download 0.16.58
#
#   Arguments:
#       version   The TigerBeetle release version to fetch (e.g., 0.16.58).
#
#   Notes:
#       - Detects the host OS (Linux, macOS, Windows) and architecture (x86_64, arm64).
#       - Downloads the appropriate release archive from GitHub.
#       - Extracts the archive, removes it, and verifies the binary with `tigerbeetle version`.
##
download() {
    local VERSION="${1:?Version required, e.g., download 0.16.58}"
    local BASE_URL="https://github.com/tigerbeetle/tigerbeetle/releases/download/${VERSION}"

    # Detect OS
    local OS
    OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
    local ARCH
    ARCH="$(uname -m)"

    case "$ARCH" in
        x86_64) ARCH="x86_64" ;;
        aarch64 | arm64) ARCH="aarch64" ;;
        *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
    esac

    local FILE
    case "$OS" in
        linux)
            FILE="tigerbeetle-${ARCH}-linux.zip"
            ;;
        darwin)
            FILE="tigerbeetle-universal-macos.zip"
            ;;
        msys*|cygwin*|mingw*|windowsnt)
            FILE="tigerbeetle-${ARCH}-windows.zip"
            ;;
        *)
            echo "Unsupported OS: $OS"
            exit 1
            ;;
    esac

    echo "Downloading TigerBeetle $VERSION for $OS/$ARCH..."
    curl -LO "${BASE_URL}/${FILE}"

    echo "Extracting..."
    if [[ "$FILE" == *.tar.gz ]]; then
        tar -xzf "$FILE"
    elif [[ "$FILE" == *.zip ]]; then
        unzip -o "$FILE"
    fi

    echo "TigerBeetle downloaded and extracted."
    rm -f "$FILE"

    ./tigerbeetle version
}

VERSION=0.16.58
download $VERSION
