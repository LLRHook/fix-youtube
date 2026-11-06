"""Compatibility entry point for the Rust extension packager. Python 3.9+."""
import argparse
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("browser", nargs="?", choices=("chrome", "firefox", "all"), default="all")
    args = parser.parse_args()
    try:
        result = subprocess.run([
            "cargo", "run", "--locked", "--release", "--manifest-path",
            str(ROOT / "tools/packager/Cargo.toml"), "--", "--root", str(ROOT), args.browser,
        ], check=False)
    except FileNotFoundError:
        parser.exit(1, "Build failed: Cargo is required. Install Rust 1.88 or newer, then rerun this command.\n")
    sys.exit(result.returncode)
