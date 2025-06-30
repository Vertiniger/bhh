#!/bin/bash

SUBNETS=(
    # 🇷🇺 Rusia
    "45.144.225.0/24"     # Moscow region - open 8080/3128 no auth
    "185.6.233.0/24"      # Russian proxy hosting, tanpa whitelist
    "193.106.191.0/24"    # VPS + open residential proxy (HTTP/SOCKS)

    # 🇻🇳 Vietnam
    "103.175.220.0/24"    # Viettel - open HTTP proxy 3128/80
    "113.161.0.0/24"      # Residential IP, banyak port proxy terbuka (no auth)

    # 🇨🇳 China
    "123.125.0.0/24"      # Beijing Telecom – ditemukan SOCKS5 tanpa auth
    "113.200.0.0/24"      # China Unicom – terbuka di 8080/3128 tanpa login

    # 🇸🇦 Saudi Arabia
    "46.185.128.0/24"     # STC Network – beberapa IP open proxy tanpa whitelist
    "5.42.199.0/24"       # Local ISP proxy – port 3128/8080 aktif

    # 🇪🇬 Mesir / Arab Region
    "156.200.0.0/16"      # Telecom Egypt – banyak ditemukan open proxy langsung
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
