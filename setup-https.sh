#!/bin/bash
# Setup script for HTTPS on emergent-arena.com
# Run this with: sudo ./setup-https.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🔐 Setting up HTTPS for emergent-arena.com..."

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run with sudo"
   echo "   Run: sudo $0"
   exit 1
fi

# Get the non-root user who called sudo
ACTUAL_USER="${SUDO_USER:-$USER}"

echo "📝 Setting up pf port forwarding rules..."

# Create pf anchor file
cat > /etc/pf.anchors/emergent-arena << 'EOF'
# Redirect 80 -> 8080 and 443 -> 8443 for Caddy
rdr pass on en0 inet proto tcp from any to any port 80 -> 127.0.0.1 port 8080
rdr pass on en0 inet proto tcp from any to any port 443 -> 127.0.0.1 port 8443
EOF

# Check if anchor is already in pf.conf
if ! grep -q "emergent-arena" /etc/pf.conf 2>/dev/null; then
    echo "📝 Adding anchor to /etc/pf.conf..."
    # Backup original
    cp /etc/pf.conf /etc/pf.conf.backup.$(date +%Y%m%d%H%M%S)
    
    # Add the anchor load and rdr-anchor directives
    # Need to add rdr-anchor before any anchor directive
    sed -i '' '/^anchor/i\
rdr-anchor "emergent-arena"
' /etc/pf.conf
    
    # Add the load anchor directive at the end
    echo 'load anchor "emergent-arena" from "/etc/pf.anchors/emergent-arena"' >> /etc/pf.conf
fi

echo "🔥 Loading pf rules..."
pfctl -f /etc/pf.conf 2>/dev/null || true
pfctl -e 2>/dev/null || true

echo "✅ Port forwarding active: 80→8080, 443→8443"

# Start Caddy as a background service
echo "🚀 Starting Caddy..."
cd "$SCRIPT_DIR"

# Kill any existing Caddy process
pkill -f "caddy run" 2>/dev/null || true

# Run Caddy as the actual user (not root) in background
sudo -u "$ACTUAL_USER" nohup caddy run --config "$SCRIPT_DIR/Caddyfile" > /tmp/caddy.log 2>&1 &

sleep 3

# Check if Caddy started
if pgrep -f "caddy run" > /dev/null; then
    echo "✅ Caddy is running!"
    echo ""
    echo "🌐 Your site should now be available at:"
    echo "   https://emergent-arena.com"
    echo ""
    echo "📋 To check Caddy logs:"
    echo "   tail -f /tmp/caddy.log"
    echo ""
    echo "📋 To stop everything:"
    echo "   pkill -f 'caddy run' && sudo pfctl -d"
else
    echo "❌ Caddy failed to start. Check logs:"
    cat /tmp/caddy.log
    exit 1
fi

