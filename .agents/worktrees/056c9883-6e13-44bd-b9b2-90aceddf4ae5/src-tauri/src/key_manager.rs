use crate::models::SSHKeyInfo;
use std::fs;

pub fn list_ssh_keys() -> Vec<SSHKeyInfo> {
    let mut result = Vec::new();
    let home = match dirs::home_dir() {
        Some(h) => h,
        None => return result,
    };

    let ssh_dir = home.join(".ssh");
    if !ssh_dir.exists() {
        return result;
    }

    if let Ok(entries) = fs::read_dir(ssh_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_file() {
                continue;
            }

            let file_name = path.file_name().unwrap_or_default().to_string_lossy();

            // Ignore known non-key files
            if file_name == "config"
                || file_name == "known_hosts"
                || file_name == "known_hosts.old"
                || file_name == "authorized_keys"
                || file_name.ends_with(".pub")
                || file_name.ends_with(".old")
            {
                continue;
            }

            // Check if file starts with typical PEM / OpenSSH private key header
            if let Ok(content) = fs::read_to_string(&path) {
                if content.contains("BEGIN OPENSSH PRIVATE KEY")
                    || content.contains("BEGIN RSA PRIVATE KEY")
                    || content.contains("BEGIN PRIVATE KEY")
                    || content.contains("BEGIN EC PRIVATE KEY")
                    || file_name.starts_with("id_")
                {
                    let key_type = if content.contains("ED25519") || file_name.contains("ed25519") {
                        "ED25519".to_string()
                    } else if content.contains("RSA") || file_name.contains("rsa") {
                        "RSA".to_string()
                    } else if content.contains("EC") || file_name.contains("ecdsa") {
                        "ECDSA".to_string()
                    } else {
                        "SSH-KEY".to_string()
                    };

                    // Check if corresponding .pub file exists for comment
                    let pub_path = path.with_extension(format!(
                        "{}.pub",
                        path.extension().unwrap_or_default().to_string_lossy()
                    ));
                    let comment = if pub_path.exists() {
                        fs::read_to_string(pub_path).ok().and_then(|pub_content| {
                            let parts: Vec<&str> = pub_content.split_whitespace().collect();
                            if parts.len() >= 3 {
                                Some(parts[2..].join(" "))
                            } else {
                                None
                            }
                        })
                    } else {
                        None
                    };

                    result.push(SSHKeyInfo {
                        path: path.to_string_lossy().to_string(),
                        display_title: file_name.to_string(),
                        key_type,
                        comment,
                    });
                }
            }
        }
    }

    result.sort_by(|a, b| a.display_title.cmp(&b.display_title));
    result
}
