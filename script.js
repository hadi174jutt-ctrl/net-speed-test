const speedElement = document.getElementById("speedValue");
const pingElement = document.getElementById("ping");
const downloadElement = document.getElementById("download");
const uploadElement = document.getElementById("upload");
const statusElement = document.getElementById("status");
const startButton = document.getElementById("startButton");
const buttonText = document.getElementById("buttonText");
const speedometer = document.getElementById("speedometer");
const historyList = document.getElementById("historyList");
const clearHistoryButton = document.getElementById("clearHistoryButton");
const themeButton = document.getElementById("themeButton");
const themeIcon = document.getElementById("themeIcon");

const HISTORY_KEY = "netspeed-history";
const THEME_KEY = "netspeed-theme";
const TEST_FILE_SIZE = 5_000_000;

function setTheme(theme) {
  const isLight = theme === "light";
  document.body.classList.toggle("light-theme", isLight);
  themeIcon.textContent = isLight ? "☾" : "☀";
  document
    .querySelector('meta[name="theme-color"]')
    .setAttribute("content", isLight ? "#eef3f8" : "#08111f");
  localStorage.setItem(THEME_KEY, theme);
}

function loadTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  setTheme(savedTheme === "light" ? "light" : "dark");
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function saveResult(result) {
  const history = getHistory();
  history.unshift(result);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 5)));
  renderHistory();
}

function renderHistory() {
  const history = getHistory();
  historyList.replaceChildren();

  if (history.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "empty-history";
    emptyMessage.textContent = "Your completed tests will appear here.";
    historyList.appendChild(emptyMessage);
    return;
  }

  for (const result of history) {
    const row = document.createElement("div");
    row.className = "history-row";

    const date = document.createElement("div");
    date.className = "history-date";
    date.textContent = result.date;

    row.appendChild(date);
    row.appendChild(createHistoryStat("PING", `${result.ping} ms`));
    row.appendChild(createHistoryStat("DOWNLOAD", `${result.download} Mbps`));
    row.appendChild(createHistoryStat("UPLOAD", "N/A"));

    historyList.appendChild(row);
  }
}

function createHistoryStat(label, value) {
  const stat = document.createElement("div");
  stat.className = "history-stat";

  const caption = document.createElement("span");
  caption.textContent = label;

  stat.append(caption, document.createTextNode(value));
  return stat;
}

async function measurePing() {
  const url =
    "https://www.cloudflare.com/cdn-cgi/trace?cacheBust=" + Date.now();

  const startTime = performance.now();
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Ping test failed.");
  }

  await response.text();
  return Math.round(performance.now() - startTime);
}

async function measureOneDownload() {
  const url =
    `https://speed.cloudflare.com/__down?bytes=${TEST_FILE_SIZE}` +
    `&cacheBust=${Date.now()}-${Math.random()}`;

  const startTime = performance.now();
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Download test failed.");
  }

  const data = await response.arrayBuffer();
  const durationInSeconds = (performance.now() - startTime) / 1000;

  if (durationInSeconds <= 0) {
    throw new Error("Could not measure download time.");
  }

  const megabitsDownloaded = (data.byteLength * 8) / 1_000_000;
  return megabitsDownloaded / durationInSeconds;
}

async function measureDownloadSpeed() {
  const readings = [];

  for (let i = 0; i < 3; i++) {
    statusElement.textContent = `Measuring download speed… (${i + 1}/3)`;
    readings.push(await measureOneDownload());
  }

  readings.sort((a, b) => a - b);
  return readings[1];
}

function formatDate() {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date());
}

themeButton.addEventListener("click", () => {
  const nextTheme = document.body.classList.contains("light-theme")
    ? "dark"
    : "light";
  setTheme(nextTheme);
});

clearHistoryButton.addEventListener("click", () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
});

startButton.addEventListener("click", async () => {
  startButton.disabled = true;
  buttonText.textContent = "Testing connection…";
  speedometer.classList.add("is-testing");

  speedElement.textContent = "…";
  pingElement.innerHTML = "-- <small>ms</small>";
  downloadElement.innerHTML = "-- <small>Mbps</small>";
  uploadElement.innerHTML = "N/A <small>unavailable</small>";
  statusElement.textContent = "Checking your connection…";

  try {
    const ping = await measurePing();
    const downloadSpeed = await measureDownloadSpeed();
    const roundedSpeed = downloadSpeed.toFixed(2);

    speedElement.textContent = roundedSpeed;
    pingElement.innerHTML = `${ping} <small>ms</small>`;
    downloadElement.innerHTML = `${roundedSpeed} <small>Mbps</small>`;
    statusElement.textContent = "Test complete. Results are estimates.";

    saveResult({
      date: formatDate(),
      ping,
      download: roundedSpeed
    });
  } catch (error) {
    speedElement.textContent = "--";
    pingElement.innerHTML = "-- <small>ms</small>";
    downloadElement.innerHTML = "-- <small>Mbps</small>";
    uploadElement.innerHTML = "N/A <small>unavailable</small>";
    statusElement.textContent =
      "Test nahi chala. Internet check karke dobara try karo.";

    console.error(error);
  } finally {
    speedometer.classList.remove("is-testing");
    startButton.disabled = false;
    buttonText.textContent = "Start speed test";
  }
});

loadTheme();
renderHistory();