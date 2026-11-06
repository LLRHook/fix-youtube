use fix_youtube_packager::{Browser, build};
use std::path::PathBuf;

fn run() -> Result<(), String> {
    let mut args = std::env::args_os().skip(1);
    let mut root = PathBuf::from(".");
    let mut browser = None;
    while let Some(arg) = args.next() {
        if arg == "--help" || arg == "-h" {
            println!(
                "Usage: fix-youtube-packager [--root DIRECTORY] [chrome|firefox|all]\nBuild allowlisted extension packages and the submission bundle (default: all)."
            );
            return Ok(());
        } else if arg == "--root" {
            root = args
                .next()
                .map(PathBuf::from)
                .ok_or("--root needs a directory")?;
        } else if browser.is_none() {
            browser = Some(Browser::parse(
                arg.to_str().ok_or("Browser name must be UTF-8")?,
            )?);
        } else {
            return Err("Expected one browser: chrome, firefox, or all".into());
        }
    }
    build(&root, browser.unwrap_or(Browser::All))
}
fn main() -> std::process::ExitCode {
    match run() {
        Ok(()) => std::process::ExitCode::SUCCESS,
        Err(message) => {
            eprintln!("Build failed: {message}");
            std::process::ExitCode::FAILURE
        }
    }
}
