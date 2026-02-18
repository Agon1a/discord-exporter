(() => {
    if (window.__discordExporterInstalled) return;
    window.__discordExporterInstalled = true;

    const CFG = {
        stepPx: 2200,
        waitMs: 1400,
        maxLoops: 1200,
        noProgressLimit: 12
    };

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    function parseDayRange(fromDay, toDay) {
        const from = new Date(fromDay + "T00:00:00");
        const to = new Date(toDay + "T23:59:59");
        return { from, to };
    }

    function findMessagesList() {
        return document.querySelector('ol[data-list-id="chat-messages"]');
    }

    function findScrollableAncestor(el) {
        let cur = el;
        while (cur && cur !== document.documentElement) {
            try {
                const st = getComputedStyle(cur);
                const overflowY = st.overflowY;
                const canScroll =
                    (overflowY === "auto" || overflowY === "scroll") &&
                    cur.scrollHeight > cur.clientHeight + 50;
                if (canScroll) return cur;
            } catch { }
            cur = cur.parentElement;
        }
        return null;
    }

    function extractFromLi(li) {
        const timeEl = li.querySelector("time[datetime]");
        if (!timeEl) return null;

        const dt = timeEl.getAttribute("datetime");
        const time = new Date(dt);
        if (Number.isNaN(time.getTime())) return null;

        const authorEl =
            li.querySelector('h3 span[class*="username"]') ||
            li.querySelector('span[class*="username"]') ||
            li.querySelector("h3");

        const author = (authorEl?.textContent || "").trim();

        const textEl =
            li.querySelector('[id^="message-content-"]') ||
            li.querySelector('div[class*="messageContent"]') ||
            li.querySelector('div[class*="markup"]');

        const text = (textEl?.textContent || "").trim();
        if (!text) return null;

        return { time, author, text };
    }

    function getVisibleMessages(listEl) {
        const out = [];
        listEl.querySelectorAll("li").forEach((li) => {
            const m = extractFromLi(li);
            if (m) out.push(m);
        });
        return out;
    }

    function getEarliestVisibleTime(listEl) {
        const times = listEl.querySelectorAll("time[datetime]");
        let min = null;
        for (const t of times) {
            const d = new Date(t.getAttribute("datetime"));
            if (!Number.isNaN(d.getTime())) {
                if (!min || d < min) min = d;
            }
        }
        return min;
    }

    function uniqueKey(m) {
        return `${m.time.toISOString()}|${m.author}|${m.text}`;
    }

    function dispatchWheelUp(scrollerEl) {
        try {
            scrollerEl.dispatchEvent(
                new WheelEvent("wheel", { deltaY: -1200, bubbles: true, cancelable: true })
            );
        } catch { }
    }

    async function scrollUpOneStep(scrollerEl) {
        const prev = scrollerEl.scrollTop;
        const next = Math.max(0, prev - CFG.stepPx);
        scrollerEl.scrollTop = next;
        dispatchWheelUp(scrollerEl);
        if (prev === 0) dispatchWheelUp(scrollerEl);
    }

    async function waitUntilEarliestChanges(listEl, prevEarliest) {
        const start = Date.now();
        while (Date.now() - start < CFG.waitMs) {
            const nowEarliest = getEarliestVisibleTime(listEl);
            if (nowEarliest && prevEarliest && nowEarliest < prevEarliest) return true;
            if (nowEarliest && !prevEarliest) return true;
            await sleep(120);
        }
        return false;
    }

    async function waitForListReady(timeoutMs = 10000) {
        const t0 = Date.now();
        while (Date.now() - t0 < timeoutMs) {
            const list = findMessagesList();
            if (list) return list;
            await sleep(200);
        }
        return null;
    }

    async function exportChat(fromDay, toDay) {
        const { from, to } = parseDayRange(fromDay, toDay);

        const listEl = await waitForListReady();
        if (!listEl) throw new Error("Не найден список сообщений: ol[data-list-id='chat-messages'].");

        const scrollerEl = findScrollableAncestor(listEl);
        if (!scrollerEl) throw new Error("Не найден скроллер сообщений (scrollable ancestor).");

        const map = new Map();

        let noProgress = 0;
        let loops = 0;

        while (loops++ < CFG.maxLoops) {
            const visible = getVisibleMessages(listEl);
            for (const m of visible) {
                if (m.time >= from && m.time <= to) {
                    map.set(uniqueKey(m), m);
                }
            }

            const earliest = getEarliestVisibleTime(listEl);

            if (earliest && earliest <= from) break;

            await scrollUpOneStep(scrollerEl);
            const progressed = await waitUntilEarliestChanges(listEl, earliest);

            if (!progressed) {
                noProgress++;
                if (scrollerEl.scrollTop === 0 && noProgress >= 3) break;
                if (noProgress >= CFG.noProgressLimit) break;
            } else {
                noProgress = 0;
            }
        }

        return Array.from(map.values())
            .sort((a, b) => a.time - b.time)
            .map((m) => ({
                time: m.time.toISOString(),
                author: m.author,
                text: m.text
            }));
    }

    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg?.action !== "START_EXPORT") return;

        (async () => {
            try {
                const data = await exportChat(msg.from, msg.to);
                sendResponse({ ok: true, data });
            } catch (e) {
                sendResponse({ ok: false, error: String(e?.message || e) });
            }
        })();

        return true;
    });
})();
