#!/bin/bash

INPUT="proxy_list.txt"
OUTPUT="live_proxies.txt"
THREADS=300  

check_proxy() {
    proxy="$1"
    ip_check=$(curl --silent --max-time 3 --connect-timeout 2 --proxy "http://$proxy" http://api.ip.sb/ip)

    if [[ "$ip_check" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo "[LIVE] $proxy -> $ip_check"
        echo "$proxy" >> "$OUTPUT"
    else
        echo "[DEAD] $proxy"
    fi
}

export -f check_proxy
export OUTPUT

> "$OUTPUT"

cat "$INPUT" | xargs -P "$THREADS" -n 1 -I {} bash -c 'check_proxy "$@"' _ {}
