 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/js/config.js b/js/config.js
new file mode 100644
index 0000000000000000000000000000000000000000..c37ea5852d267216f4a0d1f33350a32edfdf6c8a
--- /dev/null
+++ b/js/config.js
@@ -0,0 +1,64 @@
+// =====================================
+// APP CONFIG – SNUS CLICKER
+// =====================================
+
+const CONFIG_STORAGE_KEY = "snus_clicker_config";
+
+const DEFAULT_CONFIG = {
+    autosaveIntervalMs: 5000,
+    uiRefreshIntervalMs: 100
+};
+
+export const runtimeConfig = {
+    ...DEFAULT_CONFIG
+};
+
+function clampConfigNumber(value, min, max, fallback) {
+    const num = Number(value);
+    if (!Number.isFinite(num)) return fallback;
+
+    return Math.min(max, Math.max(min, Math.floor(num)));
+}
+
+function saveConfig() {
+    try {
+        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(runtimeConfig));
+    } catch {
+        // Optionales Persistieren, Fehler ignorieren
+    }
+}
+
+export function loadConfig() {
+    try {
+        const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
+        if (!raw) return;
+
+        const parsed = JSON.parse(raw);
+        if (!parsed || typeof parsed !== "object") return;
+
+        runtimeConfig.autosaveIntervalMs = clampConfigNumber(parsed.autosaveIntervalMs, 1000, 60000, DEFAULT_CONFIG.autosaveIntervalMs);
+        runtimeConfig.uiRefreshIntervalMs = clampConfigNumber(parsed.uiRefreshIntervalMs, 16, 1000, DEFAULT_CONFIG.uiRefreshIntervalMs);
+    } catch {
+        // Bei kaputter Config mit Defaults weiterlaufen
+    }
+}
+
+export function getAutosaveInterval() {
+    return runtimeConfig.autosaveIntervalMs;
+}
+
+export function getUiRefreshInterval() {
+    return runtimeConfig.uiRefreshIntervalMs;
+}
+
+export function updateAutosaveInterval(value) {
+    runtimeConfig.autosaveIntervalMs = clampConfigNumber(value, 1000, 60000, runtimeConfig.autosaveIntervalMs);
+    saveConfig();
+    return runtimeConfig.autosaveIntervalMs;
+}
+
+export function updateUiRefreshInterval(value) {
+    runtimeConfig.uiRefreshIntervalMs = clampConfigNumber(value, 16, 1000, runtimeConfig.uiRefreshIntervalMs);
+    saveConfig();
+    return runtimeConfig.uiRefreshIntervalMs;
+}
 
EOF
)
