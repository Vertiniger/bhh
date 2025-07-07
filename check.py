import asyncio
import aiohttp

PROXY_FILE = "proxies.txt"
OUTPUT_FILE = "live_proxies.txt"
TEST_URL = "http://api.ip.sb/ip"
CONCURRENCY = 5000  # Jangan terlalu tinggi agar tidak error di OS
TIMEOUT = 5  # Maks timeout 5 detik

sem = asyncio.Semaphore(CONCURRENCY)
live_proxies = []

async def check_proxy(session, proxy):
    async with sem:
        try:
            async with session.get(
                TEST_URL,
                proxy=f"http://{proxy}",
                timeout=aiohttp.ClientTimeout(total=TIMEOUT)
            ) as resp:
                if resp.status in [200, 302]:
                    text = await resp.text()
                    if "." in text and len(text.strip()) <= 20:
                        print(f"[LIVE] {proxy}")
                        live_proxies.append(proxy)
                    else:
                        print(f"[DEAD] {proxy} - Invalid response")
                else:
                    print(f"[DEAD] {proxy} - Status {resp.status}")
        except Exception:
            print(f"[DEAD] {proxy}")

async def main():
    print("📥 Memuat proxies...")

    try:
        with open(PROXY_FILE, "r") as f:
            proxies = [line.strip() for line in f if line.strip()]
    except FileNotFoundError:
        print(f"❌ File {PROXY_FILE} tidak ditemukan.")
        return

    print(f"🚀 Memulai pengecekan {len(proxies)} proxies...")

    async with aiohttp.ClientSession() as session:
        tasks = [check_proxy(session, proxy) for proxy in proxies]
        await asyncio.gather(*tasks)

    if live_proxies:
        with open(OUTPUT_FILE, "w") as f:
            f.write("\n".join(live_proxies))
        print(f"✅ Selesai. Proxy valid: {len(live_proxies)} tersimpan di {OUTPUT_FILE}")
    else:
        print("⚠️ Tidak ada proxy yang valid ditemukan.")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("❌ Dihentikan oleh pengguna.")
