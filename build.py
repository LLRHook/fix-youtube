"""Build allowlisted Chrome/Firefox folders and store ZIPs. Python 3.9+."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parent
FILES = ("background.js", "content.js", "styles.css", "popup.html", "rules.json",
         "icons/icon16.png", "icons/icon32.png", "icons/icon48.png", "icons/icon128.png", "LICENSE")
SUBMISSION_FILES = (
    "fix-youtube-chrome.zip", "fix-youtube-firefox.zip", "README.md", "LICENSE",
    "DISTRIBUTION.md", "PRIVACY.md", "docs/DEVELOPMENT.md", "docs/VERIFICATION.md",
    "docs/store/LISTING.md", "docs/store/01-overview.png",
    "docs/store/02-search.png", "docs/store/03-watch.png",
    "docs/store/promo-440x280.png", "docs/store/icon128.png",
)

def build(browser):
    target = ROOT / ("dist-" + browser)
    if target.is_symlink() or target.resolve().parent != ROOT:
        raise RuntimeError("Build output must be a direct directory in the project")
    manifest_file = ROOT / ("manifest.firefox.json" if browser == "firefox" else "manifest.json")
    manifest = json.loads(manifest_file.read_text(encoding="utf-8"))
    if target.exists():
        shutil.rmtree(target)
    target.mkdir()
    for name in FILES:
        output = target / name
        output.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / name, output)
    shutil.copyfile(manifest_file, target / "manifest.json")
    archive = ROOT / ("fix-youtube-" + browser + ".zip")
    if archive.is_symlink():
        raise RuntimeError("Package output must not be a symbolic link")
    with ZipFile(archive, "w", ZIP_DEFLATED) as package:
        for file in sorted(target.rglob("*")):
            if file.is_file():
                package.write(file, file.relative_to(target).as_posix())
    with ZipFile(archive) as package:
        assert package.testzip() is None
        assert "manifest.json" in package.namelist()
    print(f'{browser}: {manifest["version"]} -> {target.name}/ + {archive.name} ({archive.stat().st_size:,} bytes)')

def bundle_submission():
    version = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))["version"]
    archive = ROOT / ("fix-youtube-submission-" + version + ".zip")
    if archive.is_symlink():
        raise RuntimeError("Submission output must not be a symbolic link")
    # Validate the complete handoff before replacing an earlier bundle.
    for name in SUBMISSION_FILES:
        if not (ROOT / name).is_file():
            raise FileNotFoundError("Missing submission asset: " + name)
    hashes = []
    with ZipFile(archive, "w", ZIP_DEFLATED) as package:
        for name in SUBMISSION_FILES:
            file = ROOT / name
            package.write(file, name)
            hashes.append(hashlib.sha256(file.read_bytes()).hexdigest() + "  " + name)
        package.writestr("SHA256SUMS.txt", "\n".join(hashes) + "\n")
    with ZipFile(archive) as package:
        assert package.testzip() is None
    print(f"submission: {archive.name} ({archive.stat().st_size:,} bytes)")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("browser", nargs="?", choices=("chrome", "firefox", "all"), default="all")
    args = parser.parse_args()
    for browser in ("chrome", "firefox") if args.browser == "all" else (args.browser,):
        build(browser)
    if args.browser == "all":
        bundle_submission()
