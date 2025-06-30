#!/bin/bash

SUBNETS=(
    # Eksisting 10
    "45.227.252.0/22"     # Vietnam (Viettel)
    "103.15.140.0/22"     # Indonesia (Biznet)
    "103.10.197.0/24"     # Indonesia (IDNIC)
    "103.163.220.0/24"    # Malaysia
    "103.87.204.0/22"     # Thailand (3BB)
    "103.151.178.0/24"    # Singapore
    "103.105.49.0/24"     # Proxy/VPS provider
    "154.85.0.0/16"       # Africa (common SOCKS proxy range)
    "185.200.118.0/24"    # EU Proxy Range
    "190.2.136.0/22"      # South America / Proxy Hosting
    # Tambahan 50 subnet populer dan aktif
    "103.75.118.0/23"     # Indonesia (Proxynet)
    "103.106.219.0/24"    # Vietnam
    "103.152.220.0/23"    # Singapore
    "103.57.72.0/22"      # Thailand
    "103.9.185.0/24"      # Malaysia
    "103.105.212.0/22"    # Bangladesh
    "103.168.164.0/22"    # India
    "103.207.36.0/22"     # Pakistan
    "103.162.20.0/22"     # Indonesia
    "103.139.200.0/22"    # Proxy farm
    "103.141.108.0/24"    # Myanmar
    "103.148.78.0/24"     # Cambodia
    "103.168.60.0/24"     # Sri Lanka
    "103.183.124.0/24"    # Thailand
    "103.163.28.0/24"     # Nepal
    "103.189.234.0/24"    # Bangladesh
    "103.196.36.0/22"     # Vietnam
    "103.221.20.0/22"     # India
    "103.239.252.0/22"    # Asia proxy
    "103.252.204.0/22"    # SEA proxy
    "185.6.233.0/24"      # Russia (proxy/VPN)
    "185.61.138.0/24"     # Netherlands
    "185.117.153.0/24"    # France
    "185.156.172.0/24"    # Germany
    "185.180.140.0/24"    # Netherlands
    "185.205.34.0/24"     # Switzerland
    "185.216.117.0/24"    # Ukraine
    "185.234.217.0/24"    # Romania
    "185.250.150.0/24"    # Poland
    "185.252.221.0/24"    # Czech
    "45.76.0.0/16"        # VPS (Vultr)
    "45.32.0.0/16"        # VPS (Vultr)
    "104.238.0.0/16"      # VPS (Vultr)
    "198.13.32.0/19"      # VPS (Vultr)
    "149.28.0.0/16"       # VPS (Vultr)
    "139.180.0.0/16"      # VPS (Vultr)
    "45.136.108.0/24"     # EU Proxy
    "45.143.200.0/24"     # Proxy/Cloud provider
    "45.155.204.0/24"     # Proxy/VPN hosting
    "45.159.248.0/24"     # Proxy France
    "38.242.197.0/24"     # EU / Hosting
    "38.54.82.0/24"       # South America
    "38.60.188.0/24"      # USA
    "38.153.136.0/24"     # USA Proxy
    "41.204.56.0/22"      # Nigeria
    "41.86.0.0/16"        # Kenya
    "197.157.224.0/19"    # South Africa
    "196.44.160.0/19"     # Egypt
    "102.129.192.0/18"    # Morocco / Algeria
    "102.64.0.0/14"       # Africa General
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
