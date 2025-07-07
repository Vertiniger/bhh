import asyncio
import aiohttp
import re

PROXY_FILE = "proxies.txt"
OUTPUT_FILE = "live_proxies.txt"
TEST_URL = "http://api.ip.sb/ip"
CONCURRENCY = 5000  
TIMEOUT = 5  

sem = asyncio.Semaphore(CONCURRENCY)
live_proxies = []

IP_REGEX = re.compile(
    r"""^(
        (
            ([0-9]{1,3}\.){3}[0-9]{1,3}      # IPv4
        )|
        (
            ([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}  # IPv6
        )
    )$""",
    re.VERBOSE
)

async def check_proxy(session, proxy):
    async with sem:
        try:
            async with session.get(
                TEST_URL,
                proxy=f"http://{proxy}",
                timeout=aiohttp.ClientTimeout(total=TIMEOUT)
            ) as resp:
                if resp.status in [200, 302]:
                    text = (await resp.text()).strip()
                    if IP_REGEX.match(text):
                        print(f"[LIVE] {proxy} -> {text}")
                        live_proxies.append(proxy)
                    else:
                        print(f"[DEAD] {proxy} - Invalid response: {text}")
                else:
                    print(f"[DEAD] {proxy} - Status: {resp.status}")
        except Exception as e:
            print(f"[DEAD] {proxy} - Error: {type(e).__name__}")

async def main():
    print("📥 Memuat proxies...")

    try:
        with open(PROXY_FILE, "r") as f:
            proxies = [line.strip() for line in f if line.strip()]
    except FileNotFoundError:
        print("❌ File proxies.txt tidak ditemukan.")
        return

    print(f"🚀 Memulai pengecekan {len(proxies)} proxies...\n")

    async with aiohttp.ClientSession() as session:
        tasks = [check_proxy(session, proxy) for proxy in proxies]
        await asyncio.gather(*tasks)

    with open(OUTPUT_FILE, "w") as f:
        f.write("\n".join(live_proxies))

    print(f"\n✅ Selesai. Proxy valid: {len(live_proxies)} tersimpan di {OUTPUT_FILE}")

if __name__ == "__main__":
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(main())
    except RuntimeError:
        asyncio.run(main())
