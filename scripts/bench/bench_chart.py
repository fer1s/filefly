#!/usr/bin/env python3
"""Render a benchmark CSV (from app_bench.py) into a self-contained HTML report.

Two line charts over time — CPU% and RAM (MB) — each with the native and webkit series, plus
headline stat tiles (peak/avg CPU, peak RAM) and a verdict. No external assets: the data is
embedded and the SVG is drawn inline, so the file opens anywhere offline. Light/dark aware.

Usage:
  python3 scripts/bench/bench_chart.py bench-*.csv                 # -> bench-*.html
  python3 scripts/bench/bench_chart.py bench.csv -o report.html
"""

import argparse
import csv
import json
import sys
from pathlib import Path

# Categorical slots from the validated data-viz palette (blue, aqua) — light / dark steps.
SERIES = [
    {"key": "native", "label": "Native (Rust)", "light": "#2a78d6", "dark": "#3987e5"},
    {"key": "webkit", "label": "WebKit (UI)", "light": "#1baf7a", "dark": "#199e70"},
]


def load(csv_path):
    with open(csv_path) as f:
        rows = list(csv.DictReader(f))
    if not rows:
        sys.exit(f"No data rows in {csv_path}")
    data = [
        {
            "t": float(r["elapsed_s"]),
            "native_cpu": float(r["native_cpu_pct"]),
            "webkit_cpu": float(r["webkit_cpu_pct"]),
            "native_ram": float(r["native_rss_mb"]),
            "webkit_ram": float(r["webkit_rss_mb"]),
        }
        for r in rows
    ]
    return data


def stats(data):
    total_cpu = [d["native_cpu"] + d["webkit_cpu"] for d in data]
    total_ram = [d["native_ram"] + d["webkit_ram"] for d in data]
    avg_cpu = sum(total_cpu) / len(total_cpu)
    peak_ram = max(total_ram)
    verdict = ("tame", "🟢") if avg_cpu < 5 and peak_ram < 400 else (
        ("moderate", "🟡") if avg_cpu < 25 and peak_ram < 800 else ("dragon", "🔴"))
    return {
        "duration": data[-1]["t"],
        "samples": len(data),
        "peak_cpu": max(total_cpu),
        "avg_cpu": avg_cpu,
        "peak_ram": peak_ram,
        "avg_ram": sum(total_ram) / len(total_ram),
        "verdict": verdict[0],
        "verdict_icon": verdict[1],
    }


def render(data, s, title):
    payload = json.dumps({"data": data, "series": SERIES})
    tiles = [
        ("Peak CPU", f"{s['peak_cpu']:.1f}%"),
        ("Avg CPU", f"{s['avg_cpu']:.1f}%"),
        ("Peak RAM", f"{s['peak_ram']:.0f} MB"),
        ("Avg RAM", f"{s['avg_ram']:.0f} MB"),
        ("Duration", f"{s['duration']:.0f} s"),
        ("Verdict", f"{s['verdict_icon']} {s['verdict']}"),
    ]
    tiles_html = "".join(
        f'<div class="tile"><span class="tile-label">{lbl}</span>'
        f'<span class="tile-value">{val}</span></div>'
        for lbl, val in tiles
    )
    return _TEMPLATE.replace("__TITLE__", title).replace("__TILES__", tiles_html).replace("__PAYLOAD__", payload)


_TEMPLATE = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>__TITLE__</title>
<style>
  .viz-root {
    --surface-1: #fcfcfb; --surface-2: #f4f3f0;
    --text-primary: #0b0b0b; --text-secondary: #52514e; --text-muted: #86857f;
    --grid: #e6e5e1; --series-native: #2a78d6; --series-webkit: #1baf7a;
    color-scheme: light dark;
  }
  @media (prefers-color-scheme: dark) {
    .viz-root {
      --surface-1: #1a1a19; --surface-2: #232320;
      --text-primary: #fff; --text-secondary: #c3c2b7; --text-muted: #8a8a80;
      --grid: #333330; --series-native: #3987e5; --series-webkit: #199e70;
    }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--surface-2); }
  .viz-root {
    font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    color: var(--text-primary); max-width: 900px; margin: 0 auto; padding: 24px;
  }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .sub { color: var(--text-muted); font-size: 13px; margin: 0 0 20px; }
  .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-bottom: 24px; }
  .tile { background: var(--surface-1); border: 1px solid var(--grid); border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; gap: 4px; }
  .tile-label { color: var(--text-muted); font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
  .tile-value { font-size: 20px; font-weight: 600; font-variant-numeric: tabular-nums; }
  .card { background: var(--surface-1); border: 1px solid var(--grid); border-radius: 12px; padding: 16px 16px 8px; margin-bottom: 20px; }
  .card h2 { font-size: 14px; margin: 0 0 2px; }
  .legend { display: flex; gap: 16px; margin: 6px 0 4px; font-size: 13px; color: var(--text-secondary); }
  .legend span { display: inline-flex; align-items: center; gap: 6px; }
  .swatch { width: 12px; height: 12px; border-radius: 3px; display: inline-block; }
  .chart { width: 100%; overflow: visible; display: block; }
  .grid-line { stroke: var(--grid); stroke-width: 1; }
  .axis-text { fill: var(--text-muted); font-size: 11px; font-variant-numeric: tabular-nums; }
  .series-line { fill: none; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
  .end-label { font-size: 11px; font-weight: 600; font-variant-numeric: tabular-nums; }
  .crosshair { stroke: var(--text-muted); stroke-width: 1; stroke-dasharray: 3 3; opacity: 0; }
  .dot { opacity: 0; }
  .tooltip { position: absolute; pointer-events: none; background: var(--surface-1); border: 1px solid var(--grid);
    border-radius: 8px; padding: 8px 10px; font-size: 12px; opacity: 0; transition: opacity .08s; white-space: nowrap;
    box-shadow: 0 4px 12px rgba(0,0,0,.12); font-variant-numeric: tabular-nums; }
  .tooltip .tt-t { color: var(--text-muted); margin-bottom: 4px; }
  .tooltip .tt-row { display: flex; align-items: center; gap: 6px; }
</style>
</head>
<body>
<div class="viz-root">
  <h1>__TITLE__</h1>
  <p class="sub">File Browser resource usage over time — native (Rust) vs WebKit (UI) processes.</p>
  <div class="tiles">__TILES__</div>
  <div class="card"><h2>CPU</h2><div id="legend-cpu" class="legend"></div>
    <div style="position:relative"><svg id="chart-cpu" class="chart"></svg><div id="tip-cpu" class="tooltip"></div></div></div>
  <div class="card"><h2>Memory (RAM)</h2><div id="legend-ram" class="legend"></div>
    <div style="position:relative"><svg id="chart-ram" class="chart"></svg><div id="tip-ram" class="tooltip"></div></div></div>
</div>
<script>
const PAYLOAD = __PAYLOAD__;
const dark = matchMedia("(prefers-color-scheme: dark)").matches;
const color = (s) => dark ? s.dark : s.light;
const SVGNS = "http://www.w3.org/2000/svg";
const W = 860, H = 260, M = { t: 16, r: 56, b: 28, l: 44 };

function niceMax(v) {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (pow * m >= v) return pow * m;
  return pow * 10;
}

function draw(svgId, tipId, legendId, unit, accessors) {
  const svg = document.getElementById(svgId);
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  const data = PAYLOAD.data;
  const tMax = data[data.length - 1].t || 1;
  const yRaw = Math.max(...data.flatMap(d => accessors.map(a => a.get(d))), 0.0001);
  const yMax = niceMax(yRaw);
  const px = (t) => M.l + (t / tMax) * (W - M.l - M.r);
  const py = (v) => H - M.b - (v / yMax) * (H - M.t - M.b);

  // y grid + labels
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const v = (yMax / ticks) * i, y = py(v);
    const line = document.createElementNS(SVGNS, "line");
    line.setAttribute("class", "grid-line");
    line.setAttribute("x1", M.l); line.setAttribute("x2", W - M.r);
    line.setAttribute("y1", y); line.setAttribute("y2", y);
    svg.appendChild(line);
    const txt = document.createElementNS(SVGNS, "text");
    txt.setAttribute("class", "axis-text"); txt.setAttribute("x", M.l - 8);
    txt.setAttribute("y", y + 3); txt.setAttribute("text-anchor", "end");
    txt.textContent = (yMax >= 10 ? Math.round(v) : v.toFixed(1));
    svg.appendChild(txt);
  }
  // x labels
  for (let i = 0; i <= 4; i++) {
    const t = (tMax / 4) * i;
    const txt = document.createElementNS(SVGNS, "text");
    txt.setAttribute("class", "axis-text"); txt.setAttribute("x", px(t));
    txt.setAttribute("y", H - M.b + 16); txt.setAttribute("text-anchor", "middle");
    txt.textContent = Math.round(t) + "s";
    svg.appendChild(txt);
  }
  // series
  accessors.forEach(a => {
    const d = data.map(pt => `${px(pt.t)},${py(a.get(pt))}`).join(" L ");
    const path = document.createElementNS(SVGNS, "path");
    path.setAttribute("class", "series-line");
    path.setAttribute("d", "M " + d);
    path.setAttribute("stroke", color(a.series));
    svg.appendChild(path);
    // direct end-label (relief rule: identity never color-alone)
    const last = data[data.length - 1];
    const lbl = document.createElementNS(SVGNS, "text");
    lbl.setAttribute("class", "end-label"); lbl.setAttribute("x", px(last.t) + 6);
    lbl.setAttribute("y", py(a.get(last)) + 3); lbl.setAttribute("fill", color(a.series));
    lbl.textContent = a.series.label.split(" ")[0];
    svg.appendChild(lbl);
  });
  // legend
  const legend = document.getElementById(legendId);
  legend.innerHTML = accessors.map(a =>
    `<span><i class="swatch" style="background:${color(a.series)}"></i>${a.series.label}</span>`).join("");

  // hover crosshair + tooltip
  const cross = document.createElementNS(SVGNS, "line");
  cross.setAttribute("class", "crosshair"); cross.setAttribute("y1", M.t); cross.setAttribute("y2", H - M.b);
  svg.appendChild(cross);
  const dots = accessors.map(a => {
    const c = document.createElementNS(SVGNS, "circle");
    c.setAttribute("class", "dot"); c.setAttribute("r", 4);
    c.setAttribute("fill", color(a.series)); c.setAttribute("stroke", "var(--surface-1)"); c.setAttribute("stroke-width", 2);
    svg.appendChild(c); return c;
  });
  const tip = document.getElementById(tipId);
  const overlay = document.createElementNS(SVGNS, "rect");
  overlay.setAttribute("x", M.l); overlay.setAttribute("y", M.t);
  overlay.setAttribute("width", W - M.l - M.r); overlay.setAttribute("height", H - M.t - M.b);
  overlay.setAttribute("fill", "transparent");
  svg.appendChild(overlay);

  svg.addEventListener("pointermove", (e) => {
    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * W;
    if (x < M.l || x > W - M.r) return;
    const t = (x - M.l) / (W - M.l - M.r) * tMax;
    let idx = 0, best = Infinity;
    data.forEach((pt, i) => { const dd = Math.abs(pt.t - t); if (dd < best) { best = dd; idx = i; } });
    const pt = data[idx];
    cross.setAttribute("x1", px(pt.t)); cross.setAttribute("x2", px(pt.t)); cross.style.opacity = 1;
    accessors.forEach((a, i) => { dots[i].setAttribute("cx", px(pt.t)); dots[i].setAttribute("cy", py(a.get(pt))); dots[i].style.opacity = 1; });
    tip.innerHTML = `<div class="tt-t">t = ${pt.t.toFixed(0)}s</div>` + accessors.map(a =>
      `<div class="tt-row"><i class="swatch" style="background:${color(a.series)}"></i>${a.series.label}: <b>${a.get(pt).toFixed(1)}${unit}</b></div>`).join("");
    tip.style.opacity = 1;
    const tx = (px(pt.t) / W) * rect.width;
    tip.style.left = Math.min(tx + 12, rect.width - tip.offsetWidth - 4) + "px";
    tip.style.top = "8px";
  });
  svg.addEventListener("pointerleave", () => {
    cross.style.opacity = 0; tip.style.opacity = 0; dots.forEach(d => d.style.opacity = 0);
  });
}

const S = PAYLOAD.series;
draw("chart-cpu", "tip-cpu", "legend-cpu", "%", [
  { series: S[0], get: d => d.native_cpu }, { series: S[1], get: d => d.webkit_cpu },
]);
draw("chart-ram", "tip-ram", "legend-ram", " MB", [
  { series: S[0], get: d => d.native_ram }, { series: S[1], get: d => d.webkit_ram },
]);
</script>
</body>
</html>
"""


def main():
    ap = argparse.ArgumentParser(description="Render a benchmark CSV into a self-contained HTML report.")
    ap.add_argument("csv", help="CSV produced by app_bench.py")
    ap.add_argument("-o", "--out", default="", help="HTML output path (default: alongside the CSV).")
    ap.add_argument("-t", "--title", default="File Browser — resource benchmark", help="Report title.")
    args = ap.parse_args()

    data = load(args.csv)
    s = stats(data)
    html = render(data, s, args.title)
    out = args.out or str(Path(args.csv).with_suffix(".html"))
    Path(out).write_text(html)
    print(f"Report: {out}  ({s['samples']} samples, {s['duration']:.0f}s, verdict {s['verdict_icon']} {s['verdict']})")


if __name__ == "__main__":
    main()
