#!/usr/bin/env python3
"""Resource benchmark for the File Browser app over time (macOS).

Samples the running app's CPU% and resident memory (RAM) at a fixed interval and writes a CSV plus
a min/avg/p95/max summary — so you can see whether the app is a CPU/RAM "dragon" while idle vs while
working (navigating huge folders, generating thumbnails, running dir-size/search).

Two process groups are tracked separately, because a Tauri app is split across processes:

  * native  — the Rust binary (`sito-file-browser`) and its child processes. This is where the
              time-varying load lives: directory walks, thumbnail decoding, recursive dir-size,
              search — all run on native worker threads. The headline "dragon" signal.
  * webkit  — the WKWebView helpers (com.apple.WebKit.WebContent / GPU / Networking) that render
              the UI. These are re-parented to launchd (ppid 1), so a PPID tree can't see them and
              their owner isn't knowable without root. Attribution:
                --sudo : exact — `launchctl procinfo` reports each helper's responsible pid.
                default: best-effort — only helpers that appear AFTER this script starts are
                         counted as ours (a helper already alive when we attach is invisible, so
                         webkit RAM is UNDER-counted in this mode; use --sudo for the real number).

Disk I/O per process isn't exposed without root/dtrace; see --disk-hint for the fs_usage recipe.

Usage:
  python3 scripts/bench/app_bench.py                 # sample every 2s until Ctrl-C
  python3 scripts/bench/app_bench.py -i 1 -d 120     # every 1s for 120s
  sudo python3 scripts/bench/app_bench.py --sudo     # exact WebKit attribution
  python3 scripts/bench/app_bench.py --no-webkit     # native process only
"""

import argparse
import signal
import subprocess
import sys
import time
from datetime import datetime

# Native binary name (matches both the release bundle and `tauri dev`'s target/debug build).
APP_BINARY = "sito-file-browser"
# WKWebView helper executables, matched by substring in the full command.
WEBKIT_MARKERS = ("com.apple.WebKit.WebContent", "com.apple.WebKit.GPU", "com.apple.WebKit.Networking")


def snapshot():
    """One `ps` pass over every process: {pid: (ppid, cpu_pct, rss_kb, command)}."""
    out = subprocess.run(
        ["ps", "-axo", "pid=,ppid=,%cpu=,rss=,command="],
        capture_output=True, text=True,
    ).stdout
    procs = {}
    for line in out.splitlines():
        parts = line.split(None, 4)
        if len(parts) < 5:
            continue
        pid, ppid, cpu, rss, command = parts
        try:
            procs[int(pid)] = (int(ppid), float(cpu), int(rss), command)
        except ValueError:
            continue
    return procs


def descendants(roots, procs):
    """All pids reachable from `roots` following the ppid graph (roots included)."""
    children = {}
    for pid, (ppid, *_rest) in procs.items():
        children.setdefault(ppid, []).append(pid)
    seen, stack = set(), list(roots)
    while stack:
        pid = stack.pop()
        if pid in seen or pid not in procs:
            continue
        seen.add(pid)
        stack.extend(children.get(pid, []))
    return seen


def native_root_pids(name):
    """Pids whose *executable name* is exactly `name` (pgrep -x matches comm, not the full path),
    so a `tauri dev` run's node/vite processes — whose command line merely contains the project
    path — are not mistaken for the app itself."""
    out = subprocess.run(["pgrep", "-x", name], capture_output=True, text=True).stdout
    return [int(p) for p in out.split()]


def is_webkit(command):
    return any(marker in command for marker in WEBKIT_MARKERS)


def responsible_pid(pid):
    """Owning pid of a helper via `launchctl procinfo` (needs root). None if unavailable."""
    out = subprocess.run(
        ["launchctl", "procinfo", str(pid)], capture_output=True, text=True
    ).stdout
    for line in out.splitlines():
        low = line.lower()
        if "responsible pid" in low:
            digits = "".join(ch for ch in line.split("=")[-1] if ch.isdigit())
            return int(digits) if digits else None
    return None


def percentile(values, pct):
    if not values:
        return 0.0
    ordered = sorted(values)
    k = (len(ordered) - 1) * pct / 100.0
    lo = int(k)
    hi = min(lo + 1, len(ordered) - 1)
    return ordered[lo] + (ordered[hi] - ordered[lo]) * (k - lo)


def main():
    parser = argparse.ArgumentParser(description="Benchmark the File Browser app's CPU/RAM over time.")
    parser.add_argument("-i", "--interval", type=float, default=2.0, help="Seconds between samples (default 2).")
    parser.add_argument("-d", "--duration", type=float, default=0.0, help="Total seconds to run (0 = until Ctrl-C).")
    parser.add_argument("-n", "--name", default=APP_BINARY, help=f"Native binary name (default {APP_BINARY}).")
    parser.add_argument("-o", "--out", default="", help="CSV output path (default bench-<timestamp>.csv).")
    parser.add_argument("--sudo", action="store_true", help="Exact WebKit attribution via launchctl procinfo (run with sudo).")
    parser.add_argument("--no-webkit", dest="webkit", action="store_false", help="Track only the native process.")
    parser.add_argument("--disk-hint", action="store_true", help="Print the fs_usage disk-I/O recipe and exit.")
    args = parser.parse_args()

    if args.disk_hint:
        print(
            "Per-process disk I/O needs root (dtrace-backed). While the app runs, in another shell:\n\n"
            f"  sudo fs_usage -w -f filesys | grep -i {APP_BINARY}\n\n"
            "Each line is one filesystem syscall (read/write/open/stat) with the byte count — watch it\n"
            "while navigating folders / generating thumbnails to see disk pressure. Ctrl-C to stop."
        )
        return

    out_path = args.out or f"bench-{datetime.now():%Y%m%d-%H%M%S}.csv"

    # Baseline WebKit helpers: without --sudo, only helpers spawned after this point count as ours.
    baseline = snapshot()
    baseline_webkit = {pid for pid, (_pp, _c, _r, cmd) in baseline.items() if is_webkit(cmd)}
    resp_cache = {}  # pid -> owning pid, memoized (procinfo is a fork/exec per call)

    native_roots = native_root_pids(args.name)
    if not native_roots:
        print(f"⚠️  No running process named '{args.name}'. Launch the app first.", file=sys.stderr)
        sys.exit(1)

    print(f"▶ Sampling '{args.name}' (pids {native_roots}) every {args.interval}s → {out_path}")
    print(f"  WebKit: {'exact (sudo)' if args.sudo else ('best-effort (new helpers only)' if args.webkit else 'off')}")
    print("  Ctrl-C to stop and print the summary.\n")

    rows = []          # (elapsed, native_cpu, native_rss_mb, wk_cpu, wk_rss_mb)
    stop = {"now": False}
    signal.signal(signal.SIGINT, lambda *_: stop.__setitem__("now", True))

    start = time.monotonic()
    header = "elapsed_s,native_cpu_pct,native_rss_mb,webkit_cpu_pct,webkit_rss_mb,total_cpu_pct,total_rss_mb"
    with open(out_path, "w") as f:
        f.write(header + "\n")
        while not stop["now"]:
            procs = snapshot()
            native = descendants(native_roots, procs)

            n_cpu = sum(procs[p][1] for p in native if p in procs)
            n_rss = sum(procs[p][2] for p in native if p in procs) / 1024.0

            w_cpu = w_rss = 0.0
            if args.webkit:
                for pid, (_pp, cpu, rss, cmd) in procs.items():
                    if not is_webkit(cmd):
                        continue
                    if args.sudo:
                        owner = resp_cache.get(pid)
                        if owner is None:
                            owner = responsible_pid(pid)
                            resp_cache[pid] = owner
                        ours = owner in native
                    else:
                        ours = pid not in baseline_webkit
                    if ours:
                        w_cpu += cpu
                        w_rss += rss / 1024.0

            elapsed = time.monotonic() - start
            row = (elapsed, n_cpu, n_rss, w_cpu, w_rss)
            rows.append(row)
            f.write(f"{elapsed:.1f},{n_cpu:.1f},{n_rss:.1f},{w_cpu:.1f},{w_rss:.1f},{n_cpu + w_cpu:.1f},{n_rss + w_rss:.1f}\n")
            f.flush()
            print(f"  t={elapsed:6.0f}s  native {n_cpu:5.1f}% {n_rss:6.1f}MB   webkit {w_cpu:5.1f}% {w_rss:6.1f}MB   total {n_cpu + w_cpu:5.1f}% {n_rss + w_rss:6.1f}MB", flush=True)

            if args.duration and elapsed >= args.duration:
                break
            time.sleep(args.interval)

    summarize(rows, out_path)


def summarize(rows, out_path):
    if not rows:
        print("\nNo samples collected.")
        return
    total_cpu = [n + w for _e, n, _nr, w, _wr in rows]
    total_rss = [nr + wr for _e, _n, nr, _w, wr in rows]
    native_cpu = [n for _e, n, _nr, _w, _wr in rows]

    def stat(label, vals, unit):
        print(f"  {label:14} min {min(vals):7.1f}  avg {sum(vals) / len(vals):7.1f}  "
              f"p95 {percentile(vals, 95):7.1f}  max {max(vals):7.1f}  {unit}")

    print(f"\n── Summary ({len(rows)} samples over {rows[-1][0]:.0f}s) ──")
    stat("CPU total", total_cpu, "%")
    stat("CPU native", native_cpu, "%")
    stat("RAM total", total_rss, "MB")
    print(f"\nCSV: {out_path}")
    # A light verdict so you don't have to eyeball the numbers.
    avg_cpu, max_rss = sum(total_cpu) / len(total_cpu), max(total_rss)
    verdict = "🟢 tame" if avg_cpu < 5 and max_rss < 400 else ("🟡 moderate" if avg_cpu < 25 and max_rss < 800 else "🔴 dragon")
    print(f"Verdict: {verdict}  (avg CPU {avg_cpu:.1f}%, peak RAM {max_rss:.0f}MB)")


if __name__ == "__main__":
    main()
