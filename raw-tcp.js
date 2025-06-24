#!/bin/bash

SUBNETS=(
    "113.160.0.0/11"
    "117.0.0.0/13"
    "125.234.0.0/15"
    "42.112.0.0/12"
    "123.16.0.0/12"
    "203.210.128.0/17"
)

PORTS="3333,3000,3001,3128,3002,3003,3004,3005,1000,1001,1002,1003,1004,1005,5555,4444,4000,4001,4002,4003,4004,4005,6666,6000,7000,7001,7002,7003,7004,7005,7006,7009,8080,8888,8554,8555,10000,10001,10002,10003,10004,10005,10006,10007,10008,10009"

RATE="100000000"
RAW_SCAN="raw_scan_result.txt"
TEMP="temp_scan.txt"
OUTPUT="live_proxies.txt"

check_proxy() {
    local proxy=$1
    if timeout 5 curl -s --proxy http://$proxy http://httpbin.org/ip --max-time 5 > /dev/null; then
        echo "[LIVE] $proxy"
        echo "$proxy" >> "$OUTPUT"
    else
        echo "[DEAD] $proxy"
    fi
}

export -f check_proxy
export OUTPUT

for SUBNET in "${SUBNETS[@]}"; do
    echo "[*] Scanning $SUBNET ports $PORTS ..."
    sudo masscan "$SUBNET" -p"$PORTS" --rate="$RATE" --wait=0 -oL - \
        | tee -a "$RAW_SCAN" \
        | awk '/open/ {print $4 ":" $3}' >> "$TEMP"
done

sort -u "$TEMP" > "${TEMP}.unique"
mv "${TEMP}.unique" "$TEMP"

echo "[*] Verifikasi proxy (total $(wc -l < "$TEMP")) ..."
cat "$TEMP" | xargs -P 300 -I{} bash -c 'check_proxy "$@"' _ {}

echo "[✓] Scan selesai."
echo "  → Hasil scan masscan: $RAW_SCAN"
echo "  → Proxy aktif       : $OUTPUT"
