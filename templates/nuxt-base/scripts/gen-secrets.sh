#!/bin/sh
# Prints NUXT_SESSION_PASSWORD and NUXT_SETUP_CODE lines for .env.
# Only the two lines go to stdout: `./scripts/gen-secrets.sh >> .env`.
set -e
session=$(openssl rand -base64 48 | tr -d '\n')
# No 0/O/1/I/L: the setup code is typed by hand once.
code=$(LC_ALL=C tr -dc '23456789ABCDEFGHJKMNPQRSTUVWXYZ' </dev/urandom | head -c 15 | sed 's/.\{5\}/&-/g; s/-$//')
echo "Add these lines to .env (changing the session password logs everyone out):" >&2
echo "NUXT_SESSION_PASSWORD=\"$session\""
echo "NUXT_SETUP_CODE=\"$code\""
