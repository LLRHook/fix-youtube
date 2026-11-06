"""Rust package integration checks against the frozen Python builder and stdlib ZIP/SHA readers."""
import ast
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "tools/packager/Cargo.toml"
REFERENCE = "03d8f8fe91604e96ce5f76d7fb7317f0e0048f33"


class PackagerParity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        subprocess.run(["cargo", "build", "--locked", "--release", "--manifest-path", str(MANIFEST)], cwd=ROOT, check=True)
        metadata = json.loads(subprocess.check_output(["cargo", "metadata", "--no-deps", "--format-version", "1", "--manifest-path", str(MANIFEST)], cwd=ROOT))
        cls.binary = Path(metadata["target_directory"]) / "release" / ("fix-youtube-packager.exe" if os.name == "nt" else "fix-youtube-packager")
        subprocess.run(["git", "-C", str(ROOT), "merge-base", "--is-ancestor", REFERENCE, "HEAD"], check=True)
        cls.reference = subprocess.check_output(["git", "-C", str(ROOT), "show", REFERENCE + ":build.py"])
        constants = {node.targets[0].id: ast.literal_eval(node.value) for node in ast.parse(cls.reference).body
                     if isinstance(node, ast.Assign) and isinstance(node.targets[0], ast.Name) and node.targets[0].id in {"FILES", "SUBMISSION_FILES"}}
        cls.files, cls.submission_files = constants["FILES"], constants["SUBMISSION_FILES"]

    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="fix-youtube synthetic ")
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        for name in set(self.files + self.submission_files) - {"fix-youtube-chrome.zip", "fix-youtube-firefox.zip"}:
            path = self.root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(("Synthetic fixture: " + name + " ✓\n").encode() + bytes([0, 255]))
        for name, browser in [("manifest.json", "chrome"), ("manifest.firefox.json", "firefox")]:
            (self.root / name).write_text(json.dumps({"version": "0.3.1", "name": "Synthetic " + browser, "manifest_version": 3}))

    def run_packager(self, *args, success=True):
        result = subprocess.run([str(self.binary), "--root", str(self.root), *args], cwd=ROOT, capture_output=True, text=True)
        if success:
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        else:
            self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertIn("Build failed:", result.stderr)
        return result

    def members(self, data):
        with ZipFile(io.BytesIO(data)) as archive:
            self.assertIsNone(archive.testzip())
            self.assertEqual(len(archive.namelist()), len(set(archive.namelist())))
            self.assertTrue(all(info.compress_type == ZIP_DEFLATED for info in archive.infolist()))
            return {name: archive.read(name) for name in archive.namelist()}

    def outputs(self):
        return {p.name: p.read_bytes() for p in self.root.glob("*.zip")}

    def test_browser_and_submission_contents_match_frozen_python_builder(self):
        reference = self.root / "python_reference.py"
        reference.write_bytes(self.reference)
        subprocess.run([sys.executable, str(reference)], cwd=self.root, check=True, capture_output=True)
        original = self.outputs()
        self.run_packager()
        current = self.outputs()
        self.assertEqual(set(original), set(current))
        for browser in ["chrome", "firefox"]:
            name = "fix-youtube-" + browser + ".zip"
            expected = self.members(original[name])
            self.assertEqual(self.members(current[name]), expected)
            self.assertEqual(set(expected), set(self.files) | {"manifest.json"})
            for path, data in expected.items():
                self.assertEqual((self.root / ("dist-" + browser) / path).read_bytes(), data)
        name = "fix-youtube-submission-0.3.1.zip"
        before, after = self.members(original[name]), self.members(current[name])
        self.assertEqual(set(after), set(before))
        for name in self.submission_files:
            if not name.endswith(".zip"):
                self.assertEqual(after[name], before[name])
            else:
                self.assertEqual(after[name], current[name])
        sums = dict(line.split("  ", 1)[::-1] for line in after["SHA256SUMS.txt"].decode().splitlines())
        self.assertEqual(set(sums), set(self.submission_files))
        for name in self.submission_files:
            self.assertEqual(sums[name], hashlib.sha256(after[name]).hexdigest(), name)

    def test_repeated_builds_are_byte_reproducible(self):
        self.run_packager()
        before = self.outputs()
        self.run_packager("all")
        self.assertEqual(self.outputs(), before)
        self.assertEqual(list(self.root.glob(".fix-youtube-build-*")), [])

    def test_chrome_only_build_selects_chrome_manifest_and_excludes_unrelated_files(self):
        (self.root / "credentials.txt").write_text("Synthetic excluded sentinel")
        self.run_packager("chrome")
        members = self.members((self.root / "fix-youtube-chrome.zip").read_bytes())
        self.assertEqual(set(members), set(self.files) | {"manifest.json"})
        self.assertEqual(json.loads(members["manifest.json"])["name"], "Synthetic chrome")
        self.assertEqual(set(self.outputs()), {"fix-youtube-chrome.zip"})
        self.assertFalse((self.root / "dist-firefox").exists())

    def test_firefox_only_build_selects_firefox_manifest(self):
        self.run_packager("firefox")
        members = self.members((self.root / "fix-youtube-firefox.zip").read_bytes())
        self.assertEqual(json.loads(members["manifest.json"])["name"], "Synthetic firefox")
        self.assertEqual(set(self.outputs()), {"fix-youtube-firefox.zip"})
        self.assertFalse((self.root / "dist-chrome").exists())

    def test_missing_runtime_input_preserves_previous_artifacts(self):
        self.run_packager()
        before = self.outputs()
        previous_content = (self.root / "dist-chrome/content.js").read_bytes()
        (self.root / "content.js").unlink()
        self.assertIn("content.js", self.run_packager(success=False).stderr)
        self.assertEqual(self.outputs(), before)
        self.assertEqual((self.root / "dist-chrome/content.js").read_bytes(), previous_content)

    def test_missing_submission_asset_preserves_previous_artifacts(self):
        self.run_packager()
        before = self.outputs()
        (self.root / "docs/store/02-search.png").unlink()
        self.assertIn("02-search.png", self.run_packager(success=False).stderr)
        self.assertEqual(self.outputs(), before)

    def test_mismatched_manifest_versions_are_refused_before_writes(self):
        (self.root / "manifest.firefox.json").write_text('{"version":"0.3.2"}')
        self.assertIn("versions do not match", self.run_packager(success=False).stderr)
        self.assertEqual(self.outputs(), {})
        self.assertFalse((self.root / "dist-chrome").exists())

    def test_malformed_manifest_is_refused(self):
        (self.root / "manifest.json").write_text("not JSON")
        self.assertIn("Invalid manifest JSON", self.run_packager(success=False).stderr)
        self.assertEqual(self.outputs(), {})

    def test_path_like_version_is_refused(self):
        (self.root / "manifest.json").write_text('{"version":"../escape"}')
        self.assertIn("Invalid extension version", self.run_packager(success=False).stderr)
        self.assertEqual(self.outputs(), {})

    @unittest.skipIf(os.name == "nt", "symlink creation requires Windows developer mode")
    def test_symlinked_output_directory_archive_and_bundle_are_refused(self):
        outside = self.root / "outside-sentinel"
        outside.mkdir()
        sentinel = outside / "keep.txt"
        sentinel.write_text("Synthetic preserved sentinel")
        for name, directory in [("dist-chrome", True), ("fix-youtube-chrome.zip", False), ("fix-youtube-submission-0.3.1.zip", False)]:
            with self.subTest(name=name):
                output = self.root / name
                output.symlink_to(outside if directory else sentinel, target_is_directory=directory)
                self.assertIn("symbolic link", self.run_packager(success=False).stderr)
                self.assertTrue(output.is_symlink())
                self.assertEqual(sentinel.read_text(), "Synthetic preserved sentinel")
                output.unlink()

    @unittest.skipIf(os.name == "nt", "symlink creation requires Windows developer mode")
    def test_symlinked_source_parent_cannot_include_external_files(self):
        external = self.root / "outside-icons"
        (self.root / "icons").rename(external)
        (self.root / "icons").symlink_to(external, target_is_directory=True)
        self.assertIn("symbolic link", self.run_packager(success=False).stderr)
        self.assertEqual(self.outputs(), {})

    @unittest.skipIf(os.name == "nt", "symlink creation requires Windows developer mode")
    def test_dangling_output_symlinks_are_refused(self):
        output = self.root / "fix-youtube-chrome.zip"
        output.symlink_to(self.root / "missing")
        self.assertIn("symbolic link", self.run_packager(success=False).stderr)
        self.assertTrue(output.is_symlink())
        self.assertFalse((self.root / "dist-chrome").exists())

    def test_wrong_output_type_and_invalid_cli_are_actionable(self):
        (self.root / "dist-chrome").write_text("Synthetic preserved file")
        self.assertIn("Wrong output type", self.run_packager(success=False).stderr)
        self.assertEqual((self.root / "dist-chrome").read_text(), "Synthetic preserved file")
        self.assertIn("choose chrome, firefox, or all", self.run_packager("mobile", success=False).stderr)
        self.assertIn("Expected one browser", self.run_packager("chrome", "firefox", success=False).stderr)
        self.assertIn("directory", self.run_packager("--root", success=False).stderr)
        result = self.run_packager("--help")
        self.assertIn("Usage:", result.stdout)


if __name__ == "__main__":
    unittest.main(verbosity=2)
