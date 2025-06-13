#!/bin/bash

SUBNETS=(
    "14.241.0.0/16"
    "27.72.0.0/16"
    "113.161.0.0/16"
    "171.224.0.0/16"
    "116.98.0.0/16"
    "36.112.0.0/12"
    "27.184.0.0/13"
    "42.236.0.0/14"
    "61.232.0.0/14"
    "112.96.0.0/12"
    "24.0.0.0/12"
    "67.64.0.0/12"
    "73.88.0.0/14"
    "98.160.0.0/11"
    "99.100.0.0/14"
    "5.128.0.0/11"
    "46.174.0.0/16"
    "77.120.0.0/14"
    "80.240.0.0/12"
    "91.226.0.0/15"
    "80.128.0.0/10"
    "78.128.0.0/10"
    "89.0.0.0/10"
    "85.0.0.0/9"
    "217.160.0.0/11"
    "103.105.76.0/24"
    "103.179.139.0/24"
    "103.160.202.0/24"
    "80.240.0.0/12"
    "91.226.0.0/15"
)

PORTS="10001,10002,10004,10005,10006,10007,10008,10009,10010,16000,20959,3000,8080,3128,8000,8888,5000,4000,5001,5002,5003,5004,5005,4001,4002,4003,4004,4005,3333,4444,5555"

RATE="10000000"
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
