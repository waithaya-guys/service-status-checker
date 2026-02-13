#!/bin/sh

# Start the monitor service in the background
node dist/scripts/monitor.js &

# Start the Next.js application
exec node server.js
