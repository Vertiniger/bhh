import asyncio
import aiohttp

PROXY_FILE = "proxies.txt"
OUTPUT_FILE = "live_proxies.txt"
TEST_URL = "http://httpbin.org/ip"
CONCURRENCY = 10000

sem = asyncio.Semaphore(CONCURRENCY)
live_proxies = []

async def check_proxy(session, proxy):
    async with sem:
        try:
            async with session.get(TEST_URL, proxy=f"http://{proxy}", timeout=10) as resp:
                if resp.status in [200, 302]:
                    text = await resp.text()
                    if "origin" in text:
                        print(f"[LIVE] {proxy}")
                        live_proxies.append(proxy)
                else:
                    print(f"[DEAD] {proxy} - Status {resp.status}")
        except Exception:
            pass

async def main():
    print("📥 Memuat proxies...")

    with open(PROXY_FILE, "r") as f:
        proxies = [line.strip() for line in f if line.strip()]

    print(f"🚀 Memulai pengecekan {len(proxies)} proxies...")

    async with aiohttp.ClientSession() as session:
        tasks = [check_proxy(session, proxy) for proxy in proxies]
        await asyncio.gather(*tasks)

    with open(OUTPUT_FILE, "w") as f:
        f.write("\n".join(live_proxies))

    print(f"✅ Selesai. Proxy valid: {len(live_proxies)} tersimpan di {OUTPUT_FILE}")

try:
    asyncio.get_running_loop().create_task(main())
except RuntimeError:
    asyncio.run(main())
