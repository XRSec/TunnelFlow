const fs = require('fs');

let updater = fs.readFileSync('src-tauri/src/updater.rs', 'utf8');
updater = updater.replace(
  'APP_SRC=$(find "$MOUNT_DIR" -maxdepth 1 -name "*.app" | head -n 1)\necho "Found APP_SRC: $APP_SRC"\n\nif [ -n "$APP_SRC" ] && [ -d "$APP_SRC" ]; then',
  'APP_SRC=$(find "$MOUNT_DIR" -maxdepth 1 -type d -name "*.app" | head -n 1)\necho "Found APP_SRC: $APP_SRC"\n\n[ -L "$APP_SRC" ] && exit 1\n\nif [ -n "$APP_SRC" ] && [ -d "$APP_SRC" ]; then'
);
fs.writeFileSync('src-tauri/src/updater.rs', updater);

let commands = fs.readFileSync('src-tauri/src/commands.rs', 'utf8');
commands = commands.replace(
  'let fname = download_url.split("/").last().unwrap_or("update.bin").split("\\\\").last().unwrap_or("update.bin").to_string();',
  'let fname = download_url.split(\'?\').next().unwrap_or(&download_url).split("/").last().unwrap_or("update.bin").split("\\\\").last().unwrap_or("update.bin").to_string();'
);
fs.writeFileSync('src-tauri/src/commands.rs', commands);

console.log("Patched Rust files");
