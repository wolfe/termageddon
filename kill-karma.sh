#!/bin/bash

# Karma Cleanup Script
# This script kills all Karma test processes and associated Chrome instances

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        Karma Cleanup Script           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}Cleaning up Karma test processes...${NC}"

# Kill Node.js processes running Karma servers on common ports
echo -e "${BLUE}  → Killing Karma servers on ports 9876-9881...${NC}"
KARMA_PORTS=$(lsof -ti:9876 -ti:9877 -ti:9878 -ti:9879 -ti:9880 -ti:9881 2>/dev/null)
if [ ! -z "$KARMA_PORTS" ]; then
    echo "$KARMA_PORTS" | xargs kill -9 2>/dev/null || true
    echo -e "${GREEN}  ✓ Killed Karma server processes${NC}"
else
    echo -e "${GREEN}  ✓ No Karma servers found${NC}"
fi

# Kill Chrome processes with karma user-data-dir
echo -e "${BLUE}  → Killing Chrome processes with karma user-data-dir...${NC}"
CHROME_KARMA=$(ps aux | grep -E "karma-[0-9]+.*--user-data-dir" | grep -v grep | awk '{print $2}')
if [ ! -z "$CHROME_KARMA" ]; then
    echo "$CHROME_KARMA" | xargs kill -9 2>/dev/null || true
    echo -e "${GREEN}  ✓ Killed Chrome processes with karma user-data-dir${NC}"
else
    echo -e "${GREEN}  ✓ No Chrome processes with karma user-data-dir found${NC}"
fi

# Kill any remaining Chrome processes that might be test-related
echo -e "${BLUE}  → Killing any remaining karma-related Chrome processes...${NC}"
REMAINING_KARMA=$(ps aux | grep -E "karma-[0-9]+" | grep -v grep | awk '{print $2}')
if [ ! -z "$REMAINING_KARMA" ]; then
    echo "$REMAINING_KARMA" | xargs kill -9 2>/dev/null || true
    echo -e "${GREEN}  ✓ Killed remaining karma-related processes${NC}"
else
    echo -e "${GREEN}  ✓ No remaining karma-related processes found${NC}"
fi

# Show remaining Chrome processes (for reference)
echo -e "${BLUE}  → Checking for any remaining Chrome processes...${NC}"
REMAINING_CHROME=$(ps aux | grep -i chrome | grep -v grep | wc -l)
if [ "$REMAINING_CHROME" -gt 0 ]; then
    echo -e "${YELLOW}  ⚠ $REMAINING_CHROME Chrome processes still running (likely regular Chrome instances)${NC}"
else
    echo -e "${GREEN}  ✓ No Chrome processes running${NC}"
fi

echo ""
echo -e "${GREEN}Karma cleanup complete!${NC}"
echo ""
echo -e "${BLUE}If you still see Chrome windows that won't close:${NC}"
echo -e "  ${YELLOW}1.${NC} Try closing them manually"
echo -e "  ${YELLOW}2.${NC} If they reopen, run this script again"
echo -e "  ${YELLOW}3.${NC} As a last resort, restart Chrome completely"
echo ""
