#!/bin/bash

INPUT_FILE="live_proxies.txt"
OUTPUT_FILE="active.txt"

> "$OUTPUT_FILE"

while IFS= read -r proxy; do
    [[ -z "$proxy" ]] && continue

    status_code=$(curl -s -o /dev/null -w "%{http_code}" \
        --proxy "http://$proxy" \
        -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36" \
        --max-time 2 \
        http://httpbin.org/ip)

    if [[ "$status_code" != "403" && "$status_code" != "000" ]]; then
        echo "[ACTIVE] $proxy"
        echo "$proxy" >> "$OUTPUT_FILE"
    fi
done < "$INPUT_FILE"

echo "[DONE] Proxy checking completed. Results in $OUTPUT_FILE"
