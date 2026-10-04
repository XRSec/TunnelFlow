use std::path::PathBuf;
use std::time::Duration;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tokio::io::AsyncWriteExt;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateInfo {
    pub has_update: bool,
    pub current_version: String,
    pub latest_version: String,
    pub release_name: String,
    pub release_notes: String,
    pub release_url: String,
    pub published_at: String,
    pub asset_name: Option<String>,
    pub asset_download_url: Option<String>,
    pub asset_size: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadProgress {
    pub downloaded: u64,
    pub total: u64,
    pub percent: f64,
}

#[derive(Debug, Deserialize)]
struct GithubRelease {
    tag_name: String,
    name: Option<String>,
    body: Option<String>,
    html_url: String,
    published_at: Option<String>,
    #[serde(default)]
    assets: Vec<GithubAsset>,
}

#[derive(Debug, Deserialize)]
struct GithubAsset {
    name: String,
    browser_download_url: String,
    size: u64,
}

fn parse_version_components(v: &str) -> Vec<u64> {
    let clean = v.trim().trim_start_matches(|c| c == 'v' || c == 'V');
    let core = clean.split(|c| c == '-' || c == '+').next().unwrap_or(clean);
    core.split('.')
        .filter_map(|s| s.parse::<u64>().ok())
        .collect()
}

pub fn is_newer_version(latest: &str, current: &str) -> bool {
    let v_latest = parse_version_components(latest);
    let v_current = parse_version_components(current);
    let max_len = v_latest.len().max(v_current.len());

    for i in 0..max_len {
        let l = v_latest.get(i).copied().unwrap_or(0);
        let c = v_current.get(i).copied().unwrap_or(0);
        if l > c {
            return true;
        }
        if l < c {
            return false;
        }
    }
    false
}

fn match_best_asset<'a>(assets: &'a [GithubAsset]) -> Option<&'a GithubAsset> {
    match_best_asset_for(assets, std::env::consts::OS, std::env::consts::ARCH)
}

fn match_best_asset_for<'a>(assets: &'a [GithubAsset], os: &str, arch: &str) -> Option<&'a GithubAsset> {
    match os {
        "macos" => {
            // macOS prefers DMG packages
            let dmgs: Vec<&GithubAsset> = assets.iter().filter(|a| a.name.ends_with(".dmg")).collect();
            if arch == "aarch64" {
                // Apple Silicon: prefer aarch64, then universal, then any dmg
                if let Some(a) = dmgs.iter().find(|a| a.name.contains("aarch64") || a.name.contains("arm64")) {
                    return Some(a);
                }
                if let Some(a) = dmgs.iter().find(|a| a.name.contains("universal")) {
                    return Some(a);
                }
            } else {
                // Intel x86_64: prefer x64, then universal, then any dmg
                if let Some(a) = dmgs.iter().find(|a| a.name.contains("x64") || a.name.contains("x86_64")) {
                    return Some(a);
                }
                if let Some(a) = dmgs.iter().find(|a| a.name.contains("universal")) {
                    return Some(a);
                }
            }
            dmgs.first().copied()
        }
        "windows" => {
            // Windows prefers .exe setup installers, then .msi
            let exes: Vec<&GithubAsset> = assets
                .iter()
                .filter(|a| a.name.ends_with(".exe") || a.name.ends_with(".msi"))
                .collect();
            if arch == "aarch64" {
                if let Some(a) = exes.iter().find(|a| a.name.contains("arm64") || a.name.contains("aarch64")) {
                    return Some(a);
                }
            } else {
                if let Some(a) = exes.iter().find(|a| a.name.contains("x64") || a.name.contains("x86_64")) {
                    return Some(a);
                }
            }
            exes.first().copied()
        }
        "linux" => {
            // Linux prefers .AppImage, then .deb
            let appimages: Vec<&GithubAsset> = assets.iter().filter(|a| a.name.ends_with(".AppImage")).collect();
            let debs: Vec<&GithubAsset> = assets.iter().filter(|a| a.name.ends_with(".deb")).collect();

            if arch == "aarch64" {
                if let Some(a) = appimages.iter().find(|a| a.name.contains("aarch64") || a.name.contains("arm64")) {
                    return Some(a);
                }
                if let Some(a) = debs.iter().find(|a| a.name.contains("arm64") || a.name.contains("aarch64")) {
                    return Some(a);
                }
            } else {
                if let Some(a) = appimages.iter().find(|a| a.name.contains("amd64") || a.name.contains("x86_64")) {
                    return Some(a);
                }
                if let Some(a) = debs.iter().find(|a| a.name.contains("amd64") || a.name.contains("x86_64")) {
                    return Some(a);
                }
            }
            appimages.first().or_else(|| debs.first()).copied()
        }
        _ => None,
    }
}

pub async fn check_github_update() -> Result<UpdateInfo, String> {
    let current_version = env!("CARGO_PKG_VERSION").to_string();

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|e| format!("创建 HTTP 客户端失败: {}", e))?;

    // 1. Try standard GitHub REST API
    match check_via_github_api(&client, &current_version).await {
        Ok(info) => Ok(info),
        Err(api_err) => {
            eprintln!("GitHub API 请求未成功 (切换至 Web/Atom 冗余通道): {}", api_err);
            // 2. Fallback to GitHub Atom feed + expanded_assets (immune to 60 req/hr API rate limits)
            check_via_github_feed(&client, &current_version).await.map_err(|feed_err| {
                format!("检查更新失败: {} / {}", api_err, feed_err)
            })
        }
    }
}

async fn check_via_github_api(client: &reqwest::Client, current_version: &str) -> Result<UpdateInfo, String> {
    let url = "https://api.github.com/repos/XRSec/TunnelFlow/releases/latest";
    let resp = client
        .get(url)
        .header("User-Agent", format!("TunnelFlow-Updater/{}", current_version))
        .header("Accept", "application/vnd.github.v3+json")
        .send()
        .await
        .map_err(|e| format!("请求 GitHub Release 接口失败: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("GitHub API 响应异常: HTTP {}", resp.status()));
    }

    let release = resp
        .json::<GithubRelease>()
        .await
        .map_err(|e| format!("解析 Release 数据失败: {}", e))?;

    let latest_version = release.tag_name.trim().trim_start_matches(|c| c == 'v' || c == 'V').to_string();
    let has_update = is_newer_version(&latest_version, current_version);
    let matched_asset = match_best_asset(&release.assets);

    Ok(UpdateInfo {
        has_update,
        current_version: current_version.to_string(),
        latest_version,
        release_name: release.name.unwrap_or_else(|| release.tag_name.clone()),
        release_notes: release.body.unwrap_or_default(),
        release_url: release.html_url,
        published_at: release.published_at.unwrap_or_default(),
        asset_name: matched_asset.map(|a| a.name.clone()),
        asset_download_url: matched_asset.map(|a| a.browser_download_url.clone()),
        asset_size: matched_asset.map(|a| a.size),
    })
}

async fn check_via_github_feed(client: &reqwest::Client, current_version: &str) -> Result<UpdateInfo, String> {
    let atom_url = "https://github.com/XRSec/TunnelFlow/releases.atom";
    let resp = client
        .get(atom_url)
        .header("User-Agent", format!("TunnelFlow-Updater/{}", current_version))
        .send()
        .await
        .map_err(|e| format!("获取 Release Feed 失败: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("Release Feed 响应异常: HTTP {}", resp.status()));
    }

    let xml = resp.text().await.map_err(|e| format!("读取 Release Feed 内容失败: {}", e))?;

    let entry_start = xml.find("<entry>").ok_or_else(|| "未找到 Release 记录".to_string())?;
    let entry_end = xml[entry_start..].find("</entry>").map(|idx| entry_start + idx).unwrap_or(xml.len());
    let entry_str = &xml[entry_start..entry_end];

    let tag = if let Some(pos) = entry_str.find("/releases/tag/") {
        let after = &entry_str[pos + "/releases/tag/".len()..];
        let tag_end = after.find('"').unwrap_or(after.len());
        after[..tag_end].to_string()
    } else {
        return Err("无法从 Feed 中提取 Release Tag".to_string());
    };

    let title = if let Some(start) = entry_str.find("<title>") {
        let after = &entry_str[start + "<title>".len()..];
        let end = after.find("</title>").unwrap_or(after.len());
        after[..end].trim().to_string()
    } else {
        tag.clone()
    };

    let updated = if let Some(start) = entry_str.find("<updated>") {
        let after = &entry_str[start + "<updated>".len()..];
        let end = after.find("</updated>").unwrap_or(after.len());
        after[..end].trim().to_string()
    } else {
        String::new()
    };

    let notes = if let Some(start) = entry_str.find("<content type=\"html\">") {
        let after = &entry_str[start + "<content type=\"html\">".len()..];
        let end = after.find("</content>").unwrap_or(after.len());
        let raw = &after[..end];
        clean_html_text(raw)
    } else {
        String::new()
    };

    let release_url = format!("https://github.com/XRSec/TunnelFlow/releases/tag/{}", tag);

    let assets_url = format!("https://github.com/XRSec/TunnelFlow/releases/expanded_assets/{}", tag);
    let mut assets = Vec::new();

    if let Ok(assets_resp) = client.get(&assets_url).send().await {
        if assets_resp.status().is_success() {
            if let Ok(html) = assets_resp.text().await {
                let prefix = format!("/XRSec/TunnelFlow/releases/download/{}/", tag);
                let mut search_idx = 0;
                while let Some(pos) = html[search_idx..].find(&prefix) {
                    let start = search_idx + pos + prefix.len();
                    let end = html[start..].find('"').map(|idx| start + idx).unwrap_or(start);
                    let file_name = &html[start..end];
                    if !file_name.is_empty() && !assets.iter().any(|a: &GithubAsset| a.name == file_name) {
                        assets.push(GithubAsset {
                            name: file_name.to_string(),
                            browser_download_url: format!("https://github.com/XRSec/TunnelFlow/releases/download/{}/{}", tag, file_name),
                            size: 0,
                        });
                    }
                    search_idx = end;
                }
            }
        }
    }

    let latest_version = tag.trim().trim_start_matches(|c| c == 'v' || c == 'V').to_string();
    let has_update = is_newer_version(&latest_version, current_version);
    let matched_asset = match_best_asset(&assets);

    Ok(UpdateInfo {
        has_update,
        current_version: current_version.to_string(),
        latest_version,
        release_name: title,
        release_notes: notes,
        release_url,
        published_at: updated,
        asset_name: matched_asset.map(|a| a.name.clone()),
        asset_download_url: matched_asset.map(|a| a.browser_download_url.clone()),
        asset_size: matched_asset.and_then(|a| if a.size > 0 { Some(a.size) } else { None }),
    })
}

fn clean_html_text(raw: &str) -> String {
    let unescaped = raw
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&amp;", "&")
        .replace("&quot;", "\"")
        .replace("&#39;", "'");

    let formatted = unescaped
        .replace("<p>", "")
        .replace("</p>", "\n\n")
        .replace("<br>", "\n")
        .replace("<br/>", "\n")
        .replace("<br />", "\n")
        .replace("<li>", "• ")
        .replace("</li>", "\n");

    let mut result = String::new();
    let mut in_tag = false;
    for c in formatted.chars() {
        if c == '<' {
            in_tag = true;
        } else if c == '>' {
            in_tag = false;
        } else if !in_tag {
            result.push(c);
        }
    }

    result.trim().to_string()
}

pub async fn download_and_install(
    app: AppHandle,
    download_url: String,
    file_name: String,
) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(600))
        .build()
        .map_err(|e| format!("创建下载客户端失败: {}", e))?;

    let current_version = env!("CARGO_PKG_VERSION");
    let resp = client
        .get(&download_url)
        .header("User-Agent", format!("TunnelFlow-Updater/{}", current_version))
        .send()
        .await
        .map_err(|e| format!("开始下载安装包失败: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("下载安装包失败: HTTP {}", resp.status()));
    }

    let total_size = resp.content_length().unwrap_or(0);
    let temp_dir = std::env::temp_dir();
        // Sanitize file name to prevent path traversal
    if file_name.contains("..") || file_name.contains('/') || file_name.contains('\\') {
        return Err("Invalid file name format".to_string());
    }
    
    // Validate file extension
    let valid_extensions = [".dmg", ".exe", ".msi", ".AppImage", ".deb"];
    let mut is_valid_ext = false;
    for ext in valid_extensions.iter() {
        if file_name.to_lowercase().ends_with(ext.to_lowercase().as_str()) {
            is_valid_ext = true;
            break;
        }
    }
    
    if !is_valid_ext {
        return Err("Invalid update file extension".to_string());
    }

    let dest_path: PathBuf = temp_dir.join(&file_name);

    if dest_path.exists() {
        let _ = tokio::fs::remove_file(&dest_path).await;
    }

    let mut file = tokio::fs::File::create(&dest_path)
        .await
        .map_err(|e| format!("创建本地下载文件失败: {}", e))?;

    let mut stream = resp.bytes_stream();
    let mut downloaded: u64 = 0;
    let mut last_emit_percent = -1.0;

    use futures_util::StreamExt;
    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| format!("下载数据流中断: {}", e))?;
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("写入文件失败: {}", e))?;

        downloaded += chunk.len() as u64;

        let percent = if total_size > 0 {
            ((downloaded as f64 / total_size as f64) * 100.0 * 10.0).round() / 10.0
        } else {
            0.0
        };

        if (percent - last_emit_percent).abs() >= 0.5 || downloaded == total_size {
            last_emit_percent = percent;
            let _ = app.emit(
                "update-download-progress",
                DownloadProgress {
                    downloaded,
                    total: total_size,
                    percent,
                },
            );
        }
    }

    file.flush().await.map_err(|e| format!("刷新文件缓存失败: {}", e))?;
    drop(file);

    // Stop all background agent processes gracefully before launching installer
    

    // Launch platform-specific installer
    launch_installer_and_exit(app, dest_path).await
}

async fn launch_installer_and_exit(app: AppHandle, dest_path: PathBuf) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use std::os::unix::process::CommandExt;

        let pid = std::process::id();
        let target_app = get_target_app_bundle();
        let dmg_path_str = dest_path.to_string_lossy().to_string();
        let target_app_str = target_app.to_string_lossy().to_string();

        let script = r#"#!/bin/sh
exec >> /tmp/ai_agent_launcher_updater.log 2>&1
echo "=== $(date): Updater script started ==="
PID="$1"
DMG="$2"
TARGET="$3"

echo "Waiting for PID $PID to exit..."
COUNT=0
while kill -0 "$PID" 2>/dev/null && [ "$COUNT" -lt 150 ]; do
    sleep 0.1
    COUNT=$((COUNT + 1))
done

if kill -0 "$PID" 2>/dev/null; then
    echo "PID $PID still running after 15s, sending SIGKILL..."
    kill -9 "$PID" 2>/dev/null || true
fi

echo "Mounting DMG: $DMG"
MOUNT_DIR=$(mktemp -d /tmp/ai_agent_launcher_mount.XXXXXX)
hdiutil attach "$DMG" -nobrowse -noautoopen -mountpoint "$MOUNT_DIR" -quiet -noverify
MOUNT_CODE=$?
echo "hdiutil attach exit code: $MOUNT_CODE"

APP_SRC=$(find "$MOUNT_DIR" -maxdepth 1 -type d -name "*.app" | head -n 1)
echo "Found APP_SRC: $APP_SRC"

[ -L "$APP_SRC" ] && exit 1

if [ -n "$APP_SRC" ] && [ -d "$APP_SRC" ]; then
    echo "Replacing $TARGET with $APP_SRC..."
    rm -rf "$TARGET"
    ditto "$APP_SRC" "$TARGET"
    xattr -rd com.apple.quarantine "$TARGET" 2>/dev/null || true

    echo "Cleaning up mount and temp DMG..."
    hdiutil detach "$MOUNT_DIR" -force -quiet || true
    rm -rf "$MOUNT_DIR"
    rm -f "$DMG"

    echo "Relaunching $TARGET..."
    sleep 0.5
    open "$TARGET"
    echo "=== Updater finished successfully ==="
else
    echo "APP_SRC not found, opening DMG directly as fallback..."
    hdiutil detach "$MOUNT_DIR" -force -quiet || true
    rm -rf "$MOUNT_DIR"
    open "$DMG"
fi
"#;

        let script_path = std::env::temp_dir().join("tunnelflow_updater.sh");
        if let Err(e) = std::fs::write(&script_path, script) {
            let _ = std::process::Command::new("open").arg(&dest_path).spawn();
            return Err(format!("写入更新执行脚本失败: {}", e));
        }

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let _ = std::fs::set_permissions(&script_path, std::fs::Permissions::from_mode(0o755));
        }

        let mut cmd = std::process::Command::new("/bin/sh");
        cmd.arg(&script_path)
            .arg(pid.to_string())
            .arg(&dmg_path_str)
            .arg(&target_app_str)
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .process_group(0);

        if let Err(e) = cmd.spawn() {
            let _ = std::process::Command::new("open").arg(&dest_path).spawn();
            return Err(format!("启动自动更新脚本失败: {}", e));
        }

        tokio::time::sleep(Duration::from_millis(300)).await;
        app.exit(0);
        std::process::exit(0);
    }

    #[cfg(target_os = "windows")]
    {
        // On Windows: launch setup .exe installer and quit immediately so files aren't locked
        let res = std::process::Command::new(&dest_path)
            .spawn();

        if let Err(e) = res {
            return Err(format!("启动更新安装程序失败: {}", e));
        }

        tokio::time::sleep(Duration::from_millis(400)).await;
        app.exit(0);
        Ok(())
    }

    #[cfg(target_os = "linux")]
    {
        // On Linux: if AppImage, make executable and execute; if deb, open with xdg-open
        if dest_path.extension().and_then(|e| e.to_str()) == Some("AppImage") {
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                if let Ok(metadata) = std::fs::metadata(&dest_path) {
                    let mut perms = metadata.permissions();
                    perms.set_mode(0o755);
                    let _ = std::fs::set_permissions(&dest_path, perms);
                }
            }
            let _ = std::process::Command::new(&dest_path).spawn();
        } else {
            let _ = std::process::Command::new("xdg-open").arg(&dest_path).spawn();
        }

        tokio::time::sleep(Duration::from_millis(500)).await;
        app.exit(0);
        Ok(())
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        Err("当前操作系统暂不支持自动运行安装程序".to_string())
    }
}

#[cfg(target_os = "macos")]
fn get_target_app_bundle() -> PathBuf {
    if let Ok(exe) = std::env::current_exe() {
        let mut cur = exe.parent();
        while let Some(dir) = cur {
            if dir.extension().and_then(|e| e.to_str()) == Some("app") {
                return dir.to_path_buf();
            }
            cur = dir.parent();
        }
    }
    PathBuf::from("/Applications/TunnelFlow.app")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_version_comparison() {
        assert!(is_newer_version("1.0.6", "1.0.0"));
        assert!(is_newer_version("v1.0.6", "1.0.0"));
        assert!(is_newer_version("1.0.6", "v1.0.0"));
        assert!(is_newer_version("v1.0.6", "v1.0.0"));
        assert!(is_newer_version("1.0.10", "1.0.6"));
        assert!(is_newer_version("1.1.0", "1.0.9"));
        assert!(is_newer_version("2.0.0", "1.99.99"));

        assert!(!is_newer_version("1.0.0", "1.0.0"));
        assert!(!is_newer_version("1.0.0", "1.0.6"));
        assert!(!is_newer_version("v1.0.0", "v1.0.6"));
        assert!(!is_newer_version("1.0.6", "1.0.6"));
    }

    #[test]
    fn test_asset_matching() {
        let assets = vec![
            GithubAsset {
                name: "TunnelFlow_1.0.0_aarch64.dmg".to_string(),
                browser_download_url: "https://example.com/aarch64.dmg".to_string(),
                size: 100,
            },
            GithubAsset {
                name: "TunnelFlow_1.0.0_universal.dmg".to_string(),
                browser_download_url: "https://example.com/universal.dmg".to_string(),
                size: 200,
            },
            GithubAsset {
                name: "TunnelFlow_1.0.0_x64.dmg".to_string(),
                browser_download_url: "https://example.com/x64.dmg".to_string(),
                size: 150,
            },
            GithubAsset {
                name: "TunnelFlow_1.0.0_x64-setup.exe".to_string(),
                browser_download_url: "https://example.com/x64-setup.exe".to_string(),
                size: 120,
            },
            GithubAsset {
                name: "TunnelFlow_1.0.0_arm64-setup.exe".to_string(),
                browser_download_url: "https://example.com/arm64-setup.exe".to_string(),
                size: 110,
            },
            GithubAsset {
                name: "TunnelFlow_1.0.0_amd64.AppImage".to_string(),
                browser_download_url: "https://example.com/amd64.AppImage".to_string(),
                size: 130,
            },
            GithubAsset {
                name: "TunnelFlow_1.0.0_aarch64.AppImage".to_string(),
                browser_download_url: "https://example.com/aarch64.AppImage".to_string(),
                size: 125,
            },
        ];

        let mac_arm = match_best_asset_for(&assets, "macos", "aarch64").unwrap();
        assert_eq!(mac_arm.name, "TunnelFlow_1.0.0_aarch64.dmg");

        let mac_intel = match_best_asset_for(&assets, "macos", "x86_64").unwrap();
        assert_eq!(mac_intel.name, "TunnelFlow_1.0.0_x64.dmg");

        let win_x64 = match_best_asset_for(&assets, "windows", "x86_64").unwrap();
        assert_eq!(win_x64.name, "TunnelFlow_1.0.0_x64-setup.exe");

        let win_arm = match_best_asset_for(&assets, "windows", "aarch64").unwrap();
        assert_eq!(win_arm.name, "TunnelFlow_1.0.0_arm64-setup.exe");

        let linux_x64 = match_best_asset_for(&assets, "linux", "x86_64").unwrap();
        assert_eq!(linux_x64.name, "TunnelFlow_1.0.0_amd64.AppImage");

        let linux_arm = match_best_asset_for(&assets, "linux", "aarch64").unwrap();
        assert_eq!(linux_arm.name, "TunnelFlow_1.0.0_aarch64.AppImage");
    }

    #[tokio::test]
    #[ignore]
    async fn test_live_check_github_update() {
        let update_result = check_github_update().await;
        println!("Update check result: {:?}", update_result);
        assert!(update_result.is_ok(), "Failed to check update: {:?}", update_result.err());
        let info = update_result.unwrap();
        assert!(info.has_update);
        assert!(info.asset_download_url.is_some());
        assert!(is_newer_version(&info.latest_version, &info.current_version));
    }
}
