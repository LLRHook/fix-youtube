//! Build the same allowlisted browser packages and submission layout as build.py.
use sha2::{Digest, Sha256};
use std::fs;
use std::io::{Cursor, Read, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, ZipArchive, ZipWriter};

type Result<T> = std::result::Result<T, String>;
type Entry = (String, Vec<u8>);

const FILES: &[&str] = &[
    "background.js",
    "content.js",
    "styles.css",
    "popup.html",
    "rules.json",
    "icons/icon16.png",
    "icons/icon32.png",
    "icons/icon48.png",
    "icons/icon128.png",
    "LICENSE",
];
const SUBMISSION_FILES: &[&str] = &[
    "fix-youtube-chrome.zip",
    "fix-youtube-firefox.zip",
    "README.md",
    "LICENSE",
    "DISTRIBUTION.md",
    "PRIVACY.md",
    "docs/DEVELOPMENT.md",
    "docs/VERIFICATION.md",
    "docs/store/LISTING.md",
    "docs/store/01-overview.png",
    "docs/store/02-search.png",
    "docs/store/03-watch.png",
    "docs/store/promo-440x280.png",
    "docs/store/icon128.png",
];

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Browser {
    Chrome,
    Firefox,
    All,
}

impl Browser {
    pub fn parse(value: &str) -> Result<Self> {
        match value {
            "chrome" => Ok(Self::Chrome),
            "firefox" => Ok(Self::Firefox),
            "all" => Ok(Self::All),
            _ => Err(format!(
                "Unknown browser {value:?}; choose chrome, firefox, or all"
            )),
        }
    }
}

fn read_input(root: &Path, name: &str) -> Result<Vec<u8>> {
    let mut path = root.to_path_buf();
    // Fixed allowlists contain only normal relative components. Refuse symlinked
    // ancestors too, so packaging cannot accidentally include files outside root.
    for component in Path::new(name).components() {
        if !matches!(component, std::path::Component::Normal(_)) {
            return Err(format!("Invalid package input: {name}"));
        }
        path.push(component);
        let metadata = fs::symlink_metadata(&path)
            .map_err(|e| format!("Missing or unreadable input {name}: {e}"))?;
        if metadata.file_type().is_symlink() {
            return Err(format!("Input must not be a symbolic link: {name}"));
        }
    }
    if !path.is_file() {
        return Err(format!("Input is not a regular file: {name}"));
    }
    fs::read(&path).map_err(|e| format!("Cannot read {name}: {e}"))
}

fn version(bytes: &[u8]) -> Result<String> {
    let manifest: serde_json::Value =
        serde_json::from_slice(bytes).map_err(|e| format!("Invalid manifest JSON: {e}"))?;
    let value = manifest["version"]
        .as_str()
        .ok_or("Manifest needs a string version")?;
    let parts: Vec<_> = value.split('.').collect();
    if !(1..=4).contains(&parts.len())
        || parts.iter().any(|part| {
            part.is_empty()
                || !part.bytes().all(|b| b.is_ascii_digit())
                || part.parse::<u16>().is_err()
        })
    {
        return Err(format!("Invalid extension version: {value:?}"));
    }
    Ok(value.to_owned())
}

fn sha256(bytes: &[u8]) -> String {
    Sha256::digest(bytes)
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}

fn archive(entries: &[Entry]) -> Result<Vec<u8>> {
    let mut writer = ZipWriter::new(Cursor::new(Vec::new()));
    // Fixed timestamps and permissions make unchanged inputs reproducible. Keep
    // the standard DEFLATE format used by Python and browser extension loaders.
    let options = SimpleFileOptions::default()
        .compression_method(CompressionMethod::Deflated)
        .compression_level(Some(6))
        .unix_permissions(0o644);
    for (name, bytes) in entries {
        writer
            .start_file(name, options)
            .map_err(|e| format!("Cannot add {name}: {e}"))?;
        writer
            .write_all(bytes)
            .map_err(|e| format!("Cannot write {name}: {e}"))?;
    }
    let bytes = writer
        .finish()
        .map_err(|e| format!("Cannot finish ZIP: {e}"))?
        .into_inner();
    // Read every entry, including its CRC, before replacing any existing output.
    let mut check =
        ZipArchive::new(Cursor::new(&bytes)).map_err(|e| format!("Invalid ZIP: {e}"))?;
    if check.len() != entries.len() {
        return Err("ZIP entry count mismatch".into());
    }
    for (index, (name, expected)) in entries.iter().enumerate() {
        let mut entry = check
            .by_index(index)
            .map_err(|e| format!("Cannot validate ZIP: {e}"))?;
        let mut actual = Vec::new();
        entry
            .read_to_end(&mut actual)
            .map_err(|e| format!("ZIP integrity failed for {name}: {e}"))?;
        if entry
            .name()
            .map_err(|e| format!("Invalid ZIP filename: {e}"))?
            .as_ref()
            != name
            || &actual != expected
        {
            return Err(format!("ZIP contents mismatch: {name}"));
        }
    }
    Ok(bytes)
}

fn check_output(path: &Path, directory: bool) -> Result<()> {
    match fs::symlink_metadata(path) {
        Ok(meta) if meta.file_type().is_symlink() => Err(format!(
            "Output must not be a symbolic link: {}",
            path.display()
        )),
        Ok(meta) if meta.is_dir() != directory => {
            Err(format!("Wrong output type: {}", path.display()))
        }
        Ok(_) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(format!("Cannot inspect output {}: {e}", path.display())),
    }
}

struct Workspace(PathBuf);
impl Workspace {
    fn new(root: &Path) -> Result<Self> {
        static NEXT: AtomicU64 = AtomicU64::new(0);
        for _ in 0..100 {
            let path = root.join(format!(
                ".fix-youtube-build-{}-{}",
                std::process::id(),
                NEXT.fetch_add(1, Ordering::Relaxed)
            ));
            match fs::create_dir(&path) {
                Ok(()) => return Ok(Self(path)),
                Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => continue,
                Err(e) => return Err(format!("Cannot stage build: {e}")),
            }
        }
        Err("Cannot allocate a unique build directory".into())
    }
}
impl Drop for Workspace {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

struct Package {
    browser: &'static str,
    version: String,
    entries: Vec<Entry>,
    bytes: Vec<u8>,
}
impl Package {
    fn prepare(root: &Path, browser: &'static str) -> Result<Self> {
        let manifest_name = if browser == "firefox" {
            "manifest.firefox.json"
        } else {
            "manifest.json"
        };
        let manifest = read_input(root, manifest_name)?;
        let version = version(&manifest)?;
        let mut entries = Vec::new();
        for name in FILES {
            entries.push(((*name).to_owned(), read_input(root, name)?));
        }
        entries.push(("manifest.json".into(), manifest));
        entries.sort_by(|a, b| a.0.cmp(&b.0));
        let bytes = archive(&entries)?;
        Ok(Self {
            browser,
            version,
            entries,
            bytes,
        })
    }
    fn zip_name(&self) -> String {
        format!("fix-youtube-{}.zip", self.browser)
    }
    fn dir_name(&self) -> String {
        format!("dist-{}", self.browser)
    }
}

/// Preflight all inputs and output paths, stage complete artifacts, then publish
/// locally. No network, browser, account, or store actions are performed.
pub fn build(root: &Path, browser: Browser) -> Result<()> {
    let root = fs::canonicalize(root).map_err(|e| format!("Cannot open project root: {e}"))?;
    if !root.is_dir() {
        return Err("Project root must be a directory".into());
    }
    let browsers: &[&str] = match browser {
        Browser::Chrome => &["chrome"],
        Browser::Firefox => &["firefox"],
        Browser::All => &["chrome", "firefox"],
    };
    let packages = browsers
        .iter()
        .map(|name| Package::prepare(&root, name))
        .collect::<Result<Vec<_>>>()?;
    let version = &packages[0].version;
    if packages.iter().any(|p| &p.version != version) {
        return Err("Browser manifest versions do not match".into());
    }
    for package in &packages {
        check_output(&root.join(package.dir_name()), true)?;
        check_output(&root.join(package.zip_name()), false)?;
    }
    let submission = if browser == Browser::All {
        let name = format!("fix-youtube-submission-{version}.zip");
        check_output(&root.join(&name), false)?;
        let mut entries = Vec::new();
        let mut sums = String::new();
        for file in SUBMISSION_FILES {
            let bytes = if let Some(package) = packages.iter().find(|p| p.zip_name() == *file) {
                package.bytes.clone()
            } else {
                read_input(&root, file)?
            };
            sums.push_str(&format!("{}  {file}\n", sha256(&bytes)));
            entries.push(((*file).to_owned(), bytes));
        }
        entries.push(("SHA256SUMS.txt".into(), sums.into_bytes()));
        Some((name, archive(&entries)?))
    } else {
        None
    };

    let workspace = Workspace::new(&root)?;
    let mut outputs = Vec::new();
    for package in &packages {
        let directory = workspace.0.join(package.dir_name());
        fs::create_dir(&directory).map_err(|e| format!("Cannot create staged directory: {e}"))?;
        for (name, bytes) in &package.entries {
            let output = directory.join(name);
            fs::create_dir_all(output.parent().unwrap())
                .map_err(|e| format!("Cannot stage {name}: {e}"))?;
            fs::write(&output, bytes).map_err(|e| format!("Cannot stage {name}: {e}"))?;
        }
        let zip_name = package.zip_name();
        fs::write(workspace.0.join(&zip_name), &package.bytes)
            .map_err(|e| format!("Cannot stage ZIP: {e}"))?;
        outputs.push((package.dir_name(), true));
        outputs.push((zip_name, false));
    }
    if let Some((name, bytes)) = &submission {
        fs::write(workspace.0.join(name), bytes)
            .map_err(|e| format!("Cannot stage submission: {e}"))?;
        outputs.push((name.clone(), false));
    }
    // Check again after staging. Only direct, known output paths are replaced.
    for (name, directory) in &outputs {
        check_output(&root.join(name), *directory)?;
    }
    for (name, directory) in outputs {
        let target = root.join(&name);
        if directory && target.exists() {
            fs::remove_dir_all(&target).map_err(|e| format!("Cannot replace {name}: {e}"))?;
        } else if target.exists() {
            fs::remove_file(&target).map_err(|e| format!("Cannot replace {name}: {e}"))?;
        }
        fs::rename(workspace.0.join(&name), target)
            .map_err(|e| format!("Cannot install {name}: {e}"))?;
    }
    for package in &packages {
        println!(
            "{}: {} -> {}/ + {} ({} bytes)",
            package.browser,
            package.version,
            package.dir_name(),
            package.zip_name(),
            package.bytes.len()
        );
    }
    if let Some((name, bytes)) = submission {
        println!("submission: {name} ({} bytes)", bytes.len());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn sha256_matches_standard_vector() {
        assert_eq!(
            sha256(b"hello world"),
            "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
        );
    }
    #[test]
    fn invalid_versions_cannot_become_output_paths() {
        for value in [
            "",
            "../escape",
            "1/2",
            "1..2",
            "1.2.3.4.5",
            "65536.0",
            "1.a",
        ] {
            assert!(
                version(serde_json::json!({"version": value}).to_string().as_bytes()).is_err(),
                "{value}"
            );
        }
        assert_eq!(version(br#"{"version":"0.3.1"}"#).unwrap(), "0.3.1");
        assert!(version(b"invalid JSON").is_err());
        assert!(version(br#"{"version":3}"#).is_err());
    }
    #[test]
    fn zip_roundtrip_preserves_binary_and_utf8_payloads() {
        let entries = vec![
            ("icons/icon.png".into(), vec![0, 255, 1]),
            (
                "README.md".into(),
                "Synthetic fixture ✓".as_bytes().to_vec(),
            ),
        ];
        assert!(!archive(&entries).unwrap().is_empty());
    }
}
