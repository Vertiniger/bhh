#!/bin/bash

SUBNETS=(
    "14.186.32.0/24"     # Port: 10005
    "14.229.91.0/24"     # Port: 10010
    "27.74.65.0/24"      # Port: 5101, 5102, 5104
    "27.74.67.0/24"      # Port: 5104
    "27.74.75.0/24"      # Port: 5103, 5108
    "27.74.120.0/24"     # Port: 5109
    "27.76.4.0/24"       # Port: 10007
    "42.96.12.0/24"      # Port: 10007
    "67.43.228.0/24"     # Port: 13551
    "72.10.164.0/24"     # Port: 22105
    "103.82.23.0/24"     # Port: 1008
    "105.158.146.0/24"   # Port: 39811
    "115.76.69.0/24"     # Port: 1001
    "115.77.164.0/24"    # Port: 10009
    "116.98.226.0/24"    # Port: 1010
    "116.101.176.0/24"   # Port: 4010, 4004
    "116.105.99.0/24"    # Port: 1010
    "123.20.5.0/24"      # Port: 10002
    "123.20.60.0/24"     # Port: 10005, 1007
    "123.21.7.0/24"      # Port: 1003, 1004, 10007, 1007
    "123.21.7.0/24"      # Port: (duplikat, tetap digunakan)
    "171.224.219.0/24"   # Port: 10001, 10007
    "171.228.114.0/24"   # Port: 10001, 10002, 10006, 10007
    "171.228.137.0/24"   # Port: 5103
    "171.228.140.0/24"   # Port: 10003
    "171.228.173.0/24"   # Port: 5103
    "171.228.174.0/24"   # Port: 10010
    "171.237.81.0/24"    # Port: 1002, 1004, 1007, 1010
    "171.237.85.0/24"    # Port: 1002, 1004, 10005, 1007, 1010, 10002
    "171.237.86.0/24"    # Port: 1002, 1006, 1008, 1009, 1010
    "171.237.91.0/24"    # Port: 1007, 10007
    "171.237.96.0/24"    # Port: 1001, 1003, 1006, 1007, 1010
    "171.237.105.0/24"   # Port: 10003, 10005, 10009
    "171.237.106.0/24"   # Port: 10009
    "171.237.107.0/24"   # Port: 1007, 1008, 1009
    "171.237.108.0/24"   # Port: 10002, 1009, 1010, 10010
    "171.237.109.0/24"   # Port: 1001, 1007, 10008
    "171.251.99.0/24"    # Port: 1010
    "194.170.146.0/24"   # Port: 8080
    "200.174.198.0/24"   # Port: 8888
)

PORTS="80,8080,8888,1001,1002,1003,1004,1005,1006,1007,1008,1009,1010,10002,10003,10005,10006,10007,10008,10009,10010,22105,39811,4010,4004,5101,5102,5103,5104,5109,8080,8888,13551"

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
