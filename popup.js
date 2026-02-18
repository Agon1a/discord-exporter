const statusEl = document.getElementById("status");

function setStatus(s) {
    statusEl.textContent = s;
}

function isDiscordChannelsUrl(url) {
    if (!url) return false;
    try {
        const u = new URL(url);
        const hostOk = ["discord.com", "ptb.discord.com", "canary.discord.com"].includes(u.host);
        return hostOk && u.pathname.startsWith("/channels/");
    } catch {
        return false;
    }
}

function toCsv(rows) {
    const header = ["Дата", "Автор", "Текст"];
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [header.map(esc).join(",")];
    for (const r of rows) lines.push([r.time, r.author, r.text].map(esc).join(","));
    return lines.join("\n");
}

document.getElementById("exportBtn").addEventListener("click", async () => {
    const fromDate = document.getElementById("fromDate").value;
    const toDate = document.getElementById("toDate").value;

    if (!fromDate || !toDate) {
        setStatus("Укажи обе даты.");
        return;
    }
    if (fromDate > toDate) {
        setStatus("Дата 'С' не может быть позже даты 'По'.");
        return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
        setStatus("Не удалось определить активную вкладку.");
        return;
    }
    if (!isDiscordChannelsUrl(tab.url)) {
        setStatus("Открой Discord Web именно на странице канала:\nhttps://discord.com/channels/...");
        return;
    }

    setStatus("Внедряю скрипт на страницу...");

    // 1) Внедряем content.js по клику — так не будет “Receiving end does not exist”
    try {
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content.js"]
        });
    } catch (e) {
        setStatus("Не удалось внедрить скрипт.\nПопробуй обновить вкладку Discord (F5) и повторить.\n\n" + String(e));
        return;
    }

    setStatus("Запускаю экспорт (автопрокрутка вверх)...");

    // 2) Просим контент-скрипт собрать сообщения
    chrome.tabs.sendMessage(
        tab.id,
        { action: "START_EXPORT", from: fromDate, to: toDate },
        (response) => {
            if (chrome.runtime.lastError) {
                setStatus(
                    "Нет ответа от страницы.\n" +
                    "Сделай так:\n" +
                    "1) Открой канал Discord в браузере\n" +
                    "2) Нажми F5 (обновить)\n" +
                    "3) Открой расширение и попробуй снова\n\n" +
                    chrome.runtime.lastError.message
                );
                return;
            }

            if (!response?.ok) {
                setStatus("Ошибка: " + (response?.error || "неизвестно"));
                return;
            }

            const msgs = response.data || [];
            if (!msgs.length) {
                setStatus(
                    "Сообщения не найдены.\n" +
                    "Возможные причины:\n" +
                    "- в выбранные дни нет сообщений\n" +
                    "- Discord ещё не успел полностью загрузить канал\n" +
                    "- селекторы поменялись (редко, но бывает)"
                );
                return;
            }

            const csv = toCsv(msgs);

            // Скачать CSV
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `discord_export_${fromDate}_to_${toDate}.csv`;
            a.click();
            URL.revokeObjectURL(url);

            setStatus(`Готово: сообщений ${msgs.length}\nCSV скачан.`);
        }
    );
});
