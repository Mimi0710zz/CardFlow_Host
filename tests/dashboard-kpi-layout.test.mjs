import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const featureSource = readFileSync(new URL("../services/cashback-feature-ui.js", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

test("Dashboard renders all six KPI cards in one dedicated grid", () => {
  assert.match(appSource, /renderCashbackDashboard\(state,\{leadingKpiCards:primaryKpiCards\}\)/);
  assert.match(featureSource, /class="kpis dashboard-kpis"/);
  assert.match(cssSource, /\.kpis\.dashboard-kpis\{grid-template-columns:repeat\(6,minmax\(0,1fr\)\)\}/);
});

test("Dashboard KPI grid has tablet and smartphone breakpoints", () => {
  assert.match(cssSource, /min-width:768px\) and \(max-width:1199px\)\{\.kpis\.dashboard-kpis\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)\}/);
  assert.match(cssSource, /max-width:767px\)\{\.kpis\.dashboard-kpis\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
});
