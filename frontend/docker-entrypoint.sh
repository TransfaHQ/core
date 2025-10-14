#!/bin/sh
set -e

# Generate runtime config file
cat > /usr/share/nginx/html/config.js <<EOF
// Runtime configuration injected by docker-entrypoint.sh
window.ENV = {
  VITE_API_URL: "${VITE_API_URL:-http://localhost:3000}"
};
EOF

echo "Generated runtime config with VITE_API_URL=${VITE_API_URL:-http://localhost:3000}"

# Execute the main container command
exec "$@"
