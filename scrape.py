import requests
import base64
from datetime import datetime
import re

REPO_OWNER = 'Vertiniger'
REPO_NAME = 'bhh'
FILE_PATH = 'active.txt'

SOURCES = [
    "https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=5000&country=vn"
]

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

# ====== PEMROSESAN PROXY ======

def clean_proxy_line(line):
    """Bersihkan dan validasi hanya IP:PORT"""
    line = re.sub(r'^(http://|https://|socks5://|socks4://)', '', line.strip(), flags=re.IGNORECASE)

    # Cocokkan hanya IP:PORT
    match = re.match(r'^(\d{1,3}(?:\.\d{1,3}){3}):(\d{2,5})$', line)
    if match:
        ip, port = match.groups()
        # Validasi range IP dan port
        if all(0 <= int(octet) <= 255 for octet in ip.split('.')) and 0 < int(port) <= 65535:
            return f"{ip}:{port}"
    return None

def get_proxies():
    """Ambil dan bersihkan list proxy dari berbagai sumber."""
    proxies = set()
    if not SOURCES:
        print("[ERROR] No sources provided.")
        return []

    for url in SOURCES:
        try:
            resp = requests.get(url, timeout=5, headers={"User-Agent": USER_AGENT})
            resp.raise_for_status()
            raw_lines = resp.text.strip().splitlines()
            print(f"[SOURCE] {url} => {len(raw_lines)} lines")
            for line in raw_lines:
                proxy = clean_proxy_line(line)
                if proxy:
                    proxies.add(proxy)
        except Exception as e:
            print(f"[ERROR] Failed to fetch from {url}: {e}")
    return list(proxies)

# ====== UPLOAD KE GITHUB ======

def update_github_file(proxies):
    if not proxies:
        print("[WARNING] No proxies to upload.")
        return

    url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/contents/{FILE_PATH}"
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }

    try:
        response = requests.get(url, headers=headers)
        sha = response.json().get("sha") if response.status_code == 200 else None
    except Exception as e:
        print(f"[ERROR] Failed to get file info from GitHub: {e}")
        return

    content = "\n".join(proxies)
    encoded = base64.b64encode(content.encode()).decode()

    data = {
        "message": f"update proxy list at {datetime.now().isoformat()}",
        "content": encoded,
        "branch": "main"
    }
    if sha:
        data["sha"] = sha

    try:
        r = requests.put(url, headers=headers, json=data)
        if r.status_code in [200, 201]:
            print("proxy.txt successfully uploaded to GitHub.")
        else:
            print(f"[ERROR] Upload failed: {r.status_code} - {r.text}")
    except Exception as e:
        print(f"[ERROR] Failed to upload file: {e}")

# ====== MAIN ======

def main():
    print("Scraping proxy list...")
    proxies = get_proxies()
    print(f"Total valid IP:PORT scraped: {len(proxies)}")

    print("Uploading to GitHub...")
    update_github_file(proxies)

if __name__ == "__main__":
    main()
