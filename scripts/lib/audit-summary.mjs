/** Aggregates animation-audit run reports into a per-anomaly summary (summary.json / summary.md). */

export const AXES = ['scenario', 'cardTheme', 'tableTheme', 'theme', 'collectionAnimation', 'cardNumberSize', 'viewport', 'playerCount'];

export function summarize(reports) {
  const byCode = {};
  for (const report of reports) {
    for (const anomaly of report.anomalies) {
      if (anomaly.severity === 'info') continue;
      const entry = byCode[anomaly.code] ??= { code: anomaly.code, severity: anomaly.severity, runs: 0, examples: [], byAxis: {} };
      entry.runs++;
      if (entry.examples.length < 5) entry.examples.push({ run: report.runId, message: anomaly.message, t: anomaly.t });
      for (const axis of AXES) {
        const value = report.dimensions?.[axis];
        if (value === undefined) continue;
        entry.byAxis[axis] ??= {};
        entry.byAxis[axis][value] = (entry.byAxis[axis][value] ?? 0) + 1;
      }
    }
  }
  const failed = reports.filter((report) => !report.passed);
  return {
    total: reports.length,
    passed: reports.length - failed.length,
    failed: failed.length,
    codes: Object.values(byCode).sort((a, b) => b.runs - a.runs),
    failedRuns: failed.map((report) => report.runId),
  };
}

export function summaryMarkdown(summary) {
  const lines = [
    '# Animation audit',
    '',
    `${summary.passed}/${summary.total} runs passed, ${summary.failed} with findings.`,
    '',
  ];
  for (const code of summary.codes) {
    lines.push(`## ${code.code} (${code.severity}) - ${code.runs} run(s)`, '');
    for (const [axis, values] of Object.entries(code.byAxis)) {
      const distinct = Object.keys(values).length;
      if (distinct > 1 || axis === 'scenario') {
        lines.push(`- ${axis}: ${Object.entries(values).sort((a, b) => b[1] - a[1]).map(([value, count]) => `${value} (${count})`).join(', ')}`);
      }
    }
    for (const example of code.examples) lines.push(`  - \`${example.run}\` @${Math.round(example.t)}ms: ${example.message}`);
    lines.push('');
  }
  return lines.join('\n');
}

