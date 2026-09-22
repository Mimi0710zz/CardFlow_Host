# Host Cashback Client-Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor App Host `Chương trình hoàn tiền` to match App Client `Chương trình cashback` 1:1 at the user-facing workflow level while preserving Host coordination, transaction, matrix, persistence, and global Excel behavior through a canonical cashback model plus a compatibility adapter.

**Architecture:** Port the Client editor/model helpers as the UI source of truth, normalize Host legacy cashback records into a canonical `Program -> optional Packages -> Conditions` shape, and expose a deterministic adapter that flattens canonical programs back into the rule shape already consumed by Host runtime services. Host UI edits only the canonical representation; runtime consumers receive adapter output, and Excel round-trips the canonical hierarchy rather than reconstructing UI state from legacy flat columns.

**Tech Stack:** Vanilla JavaScript ES modules, HTML/CSS, browser `XLSX`, Node.js built-in test runner (`node --test`), existing Host repository/services.

**Spec:** `docs/superpowers/specs/2026-09-22-host-cashback-client-parity.md`

## Global Constraints

- App Client `services/cashback-program-config.js` and its cashback CSS are the visual/interaction source of truth.
- Card selector opens with no forced default selection; Card ID options sort A-Z / locale-aware.
- User-facing hierarchy is exactly `Thẻ -> Chương trình -> Gói hoàn tiền (optional) -> Điều kiện cashback`.
- Keep all 4 condition modes: `independent`, `first_match`, `supporting`, `all_required`.
- Package controls appear only when the selected program has packages.
- MCC multi-select uses canonical Host MCC data and displays group names, not raw code prefixes.
- `Max cashback toàn chương trình` and `Chi để đạt Max CB` are derived/read-only UI values.
- Do not hard-code bank/card names such as `MB Pla` into generic UI, model, adapter, or runtime logic.
- Preserve Host transaction/progress/coordination/matrix behavior through a compatibility adapter; do not rewrite those engines unless a compatibility test proves a required change.
- Preserve the approved Host-wide Import/Export Excel workflow and its three modes: update existing, upsert, Excel master.
- Excel-master deletion applies only to sheets present in the workbook and keeps the existing destructive confirmation flow.
- Do not change Google Drive sync behavior or unrelated Host master-data tabs.
- Keep compact Client cashback typography; do not enlarge cashback fonts.
- Do not increment `schemaVersion` unless persistence truly requires a repository-level migration.

## Review Focus

1. **Legacy single-rule cashback record:** opening/saving it must preserve Card ID, MCC, transaction method, rate, cap, spend target, notes, status and remain idempotent after a second canonicalization.
2. **Program with packages:** selecting another package must change visible conditions without losing conditions from the unselected package; runtime flattening must emit deterministic rule IDs for every package/group/condition.
3. **Supporting mode + total spend:** canonical save/load and runtime adapter must preserve `conditionMode="supporting"`, program total-spend minimum and per-condition supporting spend values without collapsing them into legacy AND/OR semantics.
4. **Excel master with partial workbook:** importing only Cashback must never delete Customers/Cards/MCC or other collections, and derived `spend-to-max` cells must never override rate/max authoritative values.
5. **No selected card / deleted program:** editor renders the Client-equivalent empty/disabled state, snapshots/cancel never resurrect a deleted record, and structure-panel navigation never points to a stale program/package.

---

### Task 1: Canonical cashback model and idempotent legacy normalization

**Files:**
- Create: `services/cashback-program-config.js`
- Create: `services/cashback-canonical.js`
- Modify: `services/local-repository.js`
- Test: `tests/cashback-canonical.test.mjs`

**Interfaces:**
- Consumes: existing Host `normalizeCashbackConditions()`, `normalizeTransactionMethod()`, `normalizeCombineOperator()`, MCC category IDs, `cashbackPrograms[]` legacy records.
- Produces:
  - `normalizeCanonicalCashbackProgram(program, {mccCategories=[]}={}) -> CanonicalProgram`
  - `normalizeCanonicalCashbackPrograms(programs, options={}) -> CanonicalProgram[]`
  - `isCanonicalCashbackProgram(program) -> boolean`
  - Client-parity exports in `services/cashback-program-config.js`: `CASHBACK_CONDITION_MODES`, `normalizeConditionMode`, `programsForCard`, `buildCashbackMccOptionItems`, `deriveProgramMaxCashback`, snapshot/selection/condition mutation helpers, editor/structure rendering helpers.

- [ ] **Step 1: Copy the Client parity helper into a Host-owned module and write failing canonicalization tests first**

Create `tests/cashback-canonical.test.mjs` with focused tests before adding production normalization:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isCanonicalCashbackProgram,
  normalizeCanonicalCashbackProgram,
  normalizeCanonicalCashbackPrograms,
} from '../services/cashback-canonical.js';

const mcc=[{id:'food',name:'Ăn uống',codes:['5812','5814']}];

test('legacy single-rule program becomes one canonical condition without losing values',()=>{
  const legacy={
    id:'p1',bankCardProductId:'card-1',name:'Ăn uống',rate:5,
    maxCashback:200000,maxCashbackUnlimited:false,eligibleTarget:4000000,
    totalTarget:5000000,mccCategoryIds:['food'],transactionMethod:'Online',
    notes:'ghi chú',status:'active',combineOperator:'AND'
  };
  const p=normalizeCanonicalCashbackProgram(legacy,{mccCategories:mcc});
  assert.equal(p.id,'p1');
  assert.equal(p.cardProductId,'card-1');
  assert.equal(p.name,'Ăn uống');
  assert.equal(p.totalSpendMinimum,5000000);
  assert.equal(p.conditions.length,1);
  assert.equal(p.conditions[0].rate,5);
  assert.equal(p.conditions[0].max,200000);
  assert.deepEqual(p.conditions[0].mccCategoryIds,['food']);
  assert.equal(p.conditions[0].channel,'Online');
  assert.equal(p.conditions[0].eligibleSpendMinimum,4000000);
  assert.equal(p.notes,'ghi chú');
  assert.equal(p.status,'active');
});

test('canonicalization is idempotent including packages and supporting mode',()=>{
  const source={
    id:'p2',cardProductId:'card-1',name:'MB style',conditionMode:'supporting',
    totalSpendMinimum:5000000,packageSwitchLimit:1,
    packages:[{id:'pkg-a',name:'Phong cách sống',groups:[{
      id:'g1',name:'Ăn uống',conditions:[{id:'c1',name:'Ăn uống',rate:5,max:200000,maxCashbackUnlimited:false,mccCategoryIds:['food'],channel:'Offline'}]
    }]}]
  };
  const once=normalizeCanonicalCashbackProgram(source,{mccCategories:mcc});
  const twice=normalizeCanonicalCashbackProgram(once,{mccCategories:mcc});
  assert.deepEqual(twice,once);
  assert.equal(isCanonicalCashbackProgram(twice),true);
});

test('normalizing a list never mutates the input objects',()=>{
  const input=[{id:'p1',bankCardProductId:'card-1',name:'A',rate:5,maxCashback:100000}];
  const before=structuredClone(input);
  normalizeCanonicalCashbackPrograms(input,{mccCategories:mcc});
  assert.deepEqual(input,before);
});
```

- [ ] **Step 2: Run the new tests and verify RED**

Run:

```bash
node --test tests/cashback-canonical.test.mjs
```

Expected: FAIL because `services/cashback-canonical.js` does not exist yet.

- [ ] **Step 3: Add `services/cashback-canonical.js` with the smallest complete normalization contract**

Implementation requirements:

```js
export function isCanonicalCashbackProgram(program={}) {
  return Boolean(program?.cardProductId && (
    Array.isArray(program.conditions) || Array.isArray(program.packages)
  ));
}

export function normalizeCanonicalCashbackProgram(program={}, {mccCategories=[]}={}) {
  // Preserve stable id/name/status/notes/start/end metadata.
  // cardProductId = program.cardProductId || program.bankCardProductId.
  // conditionMode: preserve canonical value; map legacy combine/exclusive semantics only when representable.
  // totalSpendMinimum: prefer canonical field, otherwise legacy totalSpendCondition/totalTarget.
  // Non-package legacy conditions -> canonical conditions[].
  // Package programs -> canonical packages[].groups[].conditions[].
  // Condition field mapping:
  //   transactionMethod -> channel
  //   maxCashback -> max
  //   eligibleTarget/minSpend -> eligibleSpendMinimum
  //   mccCategoryIds/allMcc/maxCashbackUnlimited/note preserved.
  // Never derive authoritative rate/max from spend-to-max.
}

export function normalizeCanonicalCashbackPrograms(programs=[], options={}) {
  return (Array.isArray(programs)?programs:[]).map(program=>normalizeCanonicalCashbackProgram(program,options));
}
```

Use existing Host helpers rather than duplicating MCC/method normalization.

- [ ] **Step 4: Port the current Client `services/cashback-program-config.js` into Host and adapt only field-name boundaries**

Start from the approved Client module and preserve these exported names/signatures:

```js
CASHBACK_CONDITION_MODES
normalizeConditionMode(value)
programsForCard(programs, cardId)
buildCashbackMccOptionItems(mccCategories)
deriveProgramMaxCashback(program)
snapshotCashbackProgram(program)
cashbackProgramSnapshotKey(program)
cacheCashbackProgramSnapshot(cache, program)
restoreCashbackProgramSnapshot(programs, snapshot)
resolveCashbackProgramSelection({cards,programs,cardId,programId,packageId})
visibleCashbackConditions(program, packageId)
addCashbackCondition(program, scope, draft)
updateCashbackCondition(program, ref, draft)
removeCashbackCondition(program, ref)
moveCashbackCondition(program, ref, direction)
buildCashbackProgramEditorModel({cards,programs,selection})
renderCashbackProgramEditor(model,helpers)
cashbackStructureSelection(selection,target)
renderCashbackProgramStructure(model,helpers)
renderCashbackProgramPage(model,helpers)
```

Host-specific adaptation must be at the input mapping boundary (`cardProductId`/Card ID), not by rewriting the Client layout.

- [ ] **Step 5: Make repository canonicalization call the new model normalizer without bumping schema unless tests prove necessary**

In `services/local-repository.js`, keep `schemaVersion: 3` and normalize `input.cashbackPrograms` via `normalizeCanonicalCashbackPrograms(...)`. Preserve all unrelated collection behavior.

- [ ] **Step 6: Run canonical tests and repository regression tests**

Run:

```bash
node --test tests/cashback-canonical.test.mjs tests/cashback-exclusive.test.mjs tests/cashback-spend-targets.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add services/cashback-canonical.js services/cashback-program-config.js services/local-repository.js tests/cashback-canonical.test.mjs
git commit -m "refactor: add canonical cashback model"
```

---

### Task 2: Deterministic compatibility adapter for Host runtime engines

**Files:**
- Create: `services/cashback-runtime-adapter.js`
- Modify: `services/order-coordination.js`
- Modify: `services/matrix-engine.js`
- Modify: `services/cashback-progress.js`
- Test: `tests/cashback-runtime-adapter.test.mjs`
- Test: existing `tests/cashback-coordination.test.mjs`, `tests/cashback-spend-targets.test.mjs`, `tests/matrix.test.mjs`

**Interfaces:**
- Consumes: canonical `state.cashbackPrograms[]` from Task 1.
- Produces:
  - `flattenCashbackProgram(program) -> LegacyRuntimeProgram[]`
  - `runtimeCashbackPrograms(programs) -> LegacyRuntimeProgram[]`
  - `runtimeProgramById(programs, runtimeId) -> LegacyRuntimeProgram|null`
  - Stable runtime IDs based on canonical IDs: non-package single-condition may keep program ID; multi-condition/package rules use `${programId}::${packageId||'base'}::${groupId||'group'}::${conditionId}`.

- [ ] **Step 1: Write failing adapter tests**

Create `tests/cashback-runtime-adapter.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {flattenCashbackProgram,runtimeCashbackPrograms} from '../services/cashback-runtime-adapter.js';

test('single canonical condition maps to legacy runtime fields',()=>{
  const [rule]=flattenCashbackProgram({
    id:'p1',cardProductId:'card-1',name:'Ăn uống',conditionMode:'independent',
    totalSpendMinimum:5000000,status:'active',
    conditions:[{id:'c1',name:'Ăn uống',rate:5,max:200000,maxCashbackUnlimited:false,eligibleSpendMinimum:4000000,mccCategoryIds:['food'],channel:'Online'}]
  });
  assert.equal(rule.bankCardProductId,'card-1');
  assert.equal(rule.rate,5);
  assert.equal(rule.maxCashback,200000);
  assert.equal(rule.eligibleTarget,4000000);
  assert.equal(rule.totalTarget,5000000);
  assert.equal(rule.transactionMethod,'Online');
  assert.deepEqual(rule.mccCategoryIds,['food']);
});

test('package flattening is deterministic and emits every visible condition',()=>{
  const program={id:'p',cardProductId:'card',name:'P',packages:[
    {id:'a',name:'A',groups:[{id:'ga',conditions:[{id:'c1',name:'C1',rate:1,max:100}]}]},
    {id:'b',name:'B',groups:[{id:'gb',conditions:[{id:'c2',name:'C2',rate:2,max:200}]}]}
  ]};
  const first=flattenCashbackProgram(program);
  const second=flattenCashbackProgram(structuredClone(program));
  assert.deepEqual(second,first);
  assert.deepEqual(first.map(x=>x.id),['p::a::ga::c1','p::b::gb::c2']);
});

test('runtime list does not mutate canonical programs',()=>{
  const programs=[{id:'p',cardProductId:'card',conditions:[{id:'c',rate:5,max:100}]}];
  const before=structuredClone(programs);
  runtimeCashbackPrograms(programs);
  assert.deepEqual(programs,before);
});
```

- [ ] **Step 2: Run adapter tests and verify RED**

```bash
node --test tests/cashback-runtime-adapter.test.mjs
```

Expected: FAIL because adapter module is missing.

- [ ] **Step 3: Implement deterministic flattening**

Rules to implement:

```js
export function flattenCashbackProgram(program={}) {
  // Canonical -> one or more legacy runtime rules.
  // Preserve parent metadata as runtimeParentProgramId, runtimePackageId,
  // runtimeGroupId, runtimeConditionId for traceability.
  // Map condition.rate/max/channel/MCC/supporting spend to legacy fields.
  // Map program.totalSpendMinimum -> totalTarget + totalSpendCondition.
  // Keep status/start/end/priority/notes.
  // No bank/card-name hard coding.
}

export function runtimeCashbackPrograms(programs=[]) {
  return programs.flatMap(flattenCashbackProgram);
}
```

For `conditionMode` semantics, encode only what existing runtime can consume directly; preserve the canonical mode on each flattened rule as `conditionMode` so downstream logic can branch explicitly when required. Do not silently map `supporting` or `all_required` to unrelated legacy exclusive behavior.

- [ ] **Step 4: Switch runtime consumers to adapted program arrays at their entry boundaries**

Changes:

- `buildCoordinationRows(state, ...)`: derive `const runtimePrograms=runtimeCashbackPrograms(state.cashbackPrograms)` once, then iterate/pass `runtimePrograms`.
- `buildCoordinationRowsForSelection(...)`: resolve against runtime programs while allowing parent canonical program IDs to expand to their runtime children.
- `buildMatrix(state, ...)`: rows use runtime programs; retain canonical parent metadata for labels if needed.
- `calculateProgress(...)`: accept the runtime rule shape exactly as before; no canonical parsing inside this function.

This keeps adapter responsibility centralized.

- [ ] **Step 5: Add review-focus test for supporting + total spend preservation**

Extend adapter test:

```js
test('supporting mode and total-spend minimum survive flattening',()=>{
  const rules=flattenCashbackProgram({
    id:'p',cardProductId:'card',conditionMode:'supporting',totalSpendMinimum:5000000,
    conditions:[
      {id:'a',rate:5,max:200000,eligibleSpendMinimum:1000000},
      {id:'b',rate:3,max:100000,eligibleSpendMinimum:2000000}
    ]
  });
  assert.ok(rules.every(x=>x.conditionMode==='supporting'));
  assert.ok(rules.every(x=>x.totalTarget===5000000));
  assert.deepEqual(rules.map(x=>x.eligibleTarget),[1000000,2000000]);
});
```

- [ ] **Step 6: Run adapter + Host runtime regression suites**

```bash
node --test \
  tests/cashback-runtime-adapter.test.mjs \
  tests/cashback-coordination.test.mjs \
  tests/cashback-spend-targets.test.mjs \
  tests/cashback-exclusive.test.mjs \
  tests/matrix.test.mjs
```

Expected: PASS. If an existing runtime test fails because it directly inspects `state.cashbackPrograms` legacy fields, adapt the fixture through canonical normalization rather than reintroducing duplicated legacy state.

- [ ] **Step 7: Commit**

```bash
git add services/cashback-runtime-adapter.js services/order-coordination.js services/matrix-engine.js services/cashback-progress.js tests/cashback-runtime-adapter.test.mjs
git commit -m "refactor: adapt canonical cashback for host runtime"
```

---

### Task 3: Client-parity Cashback UI renderer and CSS

**Files:**
- Modify: `services/cashback-program-config.js`
- Modify: `app.js`
- Modify: `styles.css`
- Modify: `index.html`
- Test: `tests/cashback-client-parity-ui.test.mjs`

**Interfaces:**
- Consumes: Task 1 editor model helpers, `state.cardProducts`, `state.cashbackPrograms`, `state.mccCategories`, existing Host `esc`, money formatting and transaction-method labels.
- Produces: Host `renderCashbackPrograms()` equivalent whose markup is generated by `renderCashbackProgramPage(model, helpers)` and matches Client selectors/classes.

- [ ] **Step 1: Write markup parity tests before wiring the page**

Create `tests/cashback-client-parity-ui.test.mjs` to render a representative model and assert Client contract selectors/text:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCashbackProgramEditorModel,renderCashbackProgramPage} from '../services/cashback-program-config.js';

const cards=[{id:'card-b',cardId:'B'},{id:'card-a',cardId:'A'}];
const programs=[{
  id:'p1',cardProductId:'card-a',name:'Main',conditionMode:'supporting',totalSpendMinimum:5000000,
  conditions:[{id:'c1',name:'Ăn uống',rate:5,max:200000,maxCashbackUnlimited:false,mccCategoryIds:['food'],channel:'Online'}]
}];

test('editor exposes same primary Client workflow controls',()=>{
  const model=buildCashbackProgramEditorModel({cards,programs,selection:{cardId:'card-a',programId:'p1'}});
  const html=renderCashbackProgramPage(model,{
    escape:String,formatMoney:String,calculateSpendToMax:(r,m)=>m/(r/100),
    mccOptions:()=>'<label>Ăn uống</label>',mccSummary:()=> 'Ăn uống',transactionMethodOptions:()=>'<option>Online</option>'
  });
  for(const marker of [
    'data-cashback-card-select','data-cashback-program-select','data-add-program',
    'THÔNG TIN CHUNG','CÁCH TÍNH CASHBACK','YÊU CẦU DOANH SỐ',
    'value="independent"','value="first_match"','value="supporting"','value="all_required"',
    'ĐIỀU KIỆN CASHBACK','data-add-condition','data-cancel-program','data-save-program',
    'CẤU TRÚC CHƯƠNG TRÌNH'
  ]) assert.match(html,new RegExp(marker));
});

test('card selector keeps empty default and sorts displayed Card IDs A-Z',()=>{
  const model=buildCashbackProgramEditorModel({cards,programs,selection:{}});
  assert.deepEqual(model.cardOptions.map(x=>x.label),['A','B']);
  assert.equal(model.selection.cardId,'');
});
```

- [ ] **Step 2: Run UI test and verify RED for Host parity assumptions**

```bash
node --test tests/cashback-client-parity-ui.test.mjs
```

Expected: at least one assertion fails until Host card field mapping and renderer are adapted.

- [ ] **Step 3: Replace the Host Cashback table body with Client page layout**

In `app.js`:

- Keep the Host navigation tab/view ID unchanged so unrelated navigation does not move.
- Replace the old `entityTable(...)` rendering for Cashback with `renderCashbackProgramPage(...)`.
- Build card inputs as `{id: cardProduct.id, cardId: cardProduct.cardId}` and adapt the editor model to display `cardId` while selecting by stable product ID.
- Keep one module-level selection object:

```js
const cashbackProgramSelection={cardId:'',programId:'',packageId:''};
const cashbackProgramSnapshots=new Map();
```

Here `cardId` is the selected Host `cardProduct.id` internally; display label remains Card ID. Do not use Card ID text as a foreign key.

- [ ] **Step 4: Port Client cashback CSS selectors verbatim where possible**

Copy the approved Client blocks for:

```text
.cashback-program-layout
.cashback-program-main
.cashback-program-workflow
.cashback-program-selectors
.cashback-program-actions
.cashback-program-section
.cashback-program-field-grid
.cashback-calculation-layout
.cashback-condition-modes
.cashback-total-spend-control
.cashback-package-selector
.cashback-program-condition-list
.cashback-program-condition
.cashback-condition-fields
.cashback-condition-order
.cashback-condition-note
.cashback-program-save
.cashback-program-structure
.cashback-structure-*
```

Only adapt surrounding Host container selectors if needed. Do not resize typography upward.

- [ ] **Step 5: Bump cashback-related asset cache version in `index.html` and module imports**

Use one new version token consistently, e.g. `20260922-host-cashback-parity-v1`, for `styles.css`, `app.js`, and newly imported cashback modules.

- [ ] **Step 6: Run UI test and static syntax checks**

```bash
node --test tests/cashback-client-parity-ui.test.mjs
node --check app.js
node --check services/cashback-program-config.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add services/cashback-program-config.js app.js styles.css index.html tests/cashback-client-parity-ui.test.mjs
git commit -m "feat: match host cashback layout to client"
```

---

### Task 4: Client-parity editor interactions, save/cancel, package navigation and stale-selection safety

**Files:**
- Modify: `app.js`
- Modify: `services/cashback-program-config.js`
- Test: `tests/cashback-client-parity-actions.test.mjs`
- Test: `tests/cashback-program-editor-live-state.test.mjs`

**Interfaces:**
- Consumes: page markup and state from Task 3.
- Produces: deterministic event handlers for select/add/rename/delete/save/cancel, condition add/update/delete/reorder, MCC dropdown, package selection and structure-panel navigation.

- [ ] **Step 1: Write failing action-helper tests for selection/cancel/deletion**

Keep DOM-independent behavior in exported helpers where possible:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cacheCashbackProgramSnapshot,
  cashbackProgramSnapshotKey,
  restoreCashbackProgramSnapshot,
  resolveCashbackProgramSelection,
  cashbackStructureSelection,
} from '../services/cashback-program-config.js';

test('no selected card keeps program and package empty',()=>{
  const s=resolveCashbackProgramSelection({cards:[{id:'card'}],programs:[{id:'p',cardProductId:'card'}]});
  assert.deepEqual(s,{cardId:'',programId:'',packageId:''});
});

test('cancel restores current program snapshot but not a deleted program',()=>{
  const cache=new Map();
  const p={id:'p',cardProductId:'card',name:'Original',conditions:[]};
  cacheCashbackProgramSnapshot(cache,p);
  const restored=restoreCashbackProgramSnapshot([{...p,name:'Edited'}],cache.get(cashbackProgramSnapshotKey(p)));
  assert.equal(restored.find(x=>x.id==='p').name,'Original');
  const afterDelete=restoreCashbackProgramSnapshot([],cache.get(cashbackProgramSnapshotKey(p)));
  assert.deepEqual(afterDelete,[]);
});

test('structure navigation changes only program/package within current card context',()=>{
  assert.deepEqual(
    cashbackStructureSelection({cardId:'card',programId:'old',packageId:''},{programId:'new',packageId:'pkg'}),
    {cardId:'card',programId:'new',packageId:'pkg'}
  );
});
```

If the current Client helper restores deleted programs, adjust the Host wrapper—not the shared helper contract—so deleted records are never resurrected.

- [ ] **Step 2: Run action tests and verify RED where Host safety wrapper is absent**

```bash
node --test tests/cashback-client-parity-actions.test.mjs
```

- [ ] **Step 3: Wire selectors and program actions**

In `app.js` bind:

```text
[data-cashback-card-select]
[data-cashback-program-select]
[data-cashback-package-select]
[data-add-program]
[data-rename-program]
[data-delete-program]
[data-structure-program-id]
```

Behavior must mirror Client:

- Changing card clears program/package selection.
- Changing program clears package selection then resolves first valid package only if the Client helper does so.
- Add requires selected card, creates one default condition, selects new program, caches snapshot after persistence.
- Rename edits only name.
- Delete confirms once, removes canonical program, clears stale selection/snapshot, re-renders.

- [ ] **Step 4: Wire condition-card editing exactly against the canonical model**

Bind:

```text
[data-condition-name]
[data-condition-channel]
[data-condition-rate]
[data-condition-max-type]
[data-condition-max]
[data-condition-spend-minimum]
[data-condition-note]
[data-add-condition]
[data-delete-condition]
[data-move-condition]
```

Use `updateCashbackCondition`, `addCashbackCondition`, `removeCashbackCondition`, `moveCashbackCondition`. Recompute the read-only spend-to-max and program max via helpers; never persist derived UI strings as authoritative values.

- [ ] **Step 5: Wire MCC multi-select and outside-click close behavior**

Use canonical Host `state.mccCategories`, but render only group names in dropdown labels. Preserve `Tất cả` semantics if canonical condition uses all-MCC. Clicking inside the dropdown keeps it open for multi-select; clicking outside closes it.

- [ ] **Step 6: Implement Save / Cancel snapshot lifecycle**

- `Lưu thay đổi`: normalize selected canonical program, replace by ID in `state.cashbackPrograms`, persist via existing `save(...)`, refresh snapshot.
- `Huỷ`: restore only if the program still exists; then re-render without persistence side effects beyond returning to last saved state.
- Keep runtime services out of editor event handlers.

- [ ] **Step 7: Run action/editor regression tests**

```bash
node --test \
  tests/cashback-client-parity-actions.test.mjs \
  tests/cashback-program-editor-live-state.test.mjs \
  tests/cashback-program-crud.test.mjs \
  tests/cashback-program-mcc-selection.test.mjs \
  tests/cashback-mcc-selector.test.mjs
```

Expected: PASS. Legacy modal-specific tests may need to be replaced only when they assert the removed Host table/modal UI rather than business behavior.

- [ ] **Step 8: Commit**

```bash
git add app.js services/cashback-program-config.js tests/cashback-client-parity-actions.test.mjs
git commit -m "feat: add client parity cashback interactions"
```

---

### Task 5: Canonical Cashback Excel round-trip in the global Host workflow

**Files:**
- Modify: `services/host-excel.js`
- Modify: `app.js` only if UI labels/preview need canonical row counts
- Test: `tests/host-excel-cashback-canonical.test.mjs`
- Test: existing `tests/host-excel.test.mjs`, `tests/host-excel-ui.test.mjs`

**Interfaces:**
- Consumes: canonical programs from Task 1 and existing global `HOST_EXPORTABLE_SHEETS`, `HOST_IMPORTABLE_SHEETS`, `exportHostSheetRows`, `previewHostImport`, `applyHostImportRows`.
- Produces: one Cashback Excel row per visible condition with stable parent/package/group/condition IDs; import reconstructs canonical programs without using derived `spend-to-max` as authority.

- [ ] **Step 1: Write failing canonical Excel round-trip tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {exportHostSheetRows,applyHostImportRows} from '../services/host-excel.js';

const state={
  customers:[{id:'customer-keep'}],
  cardProducts:[{id:'card',cardId:'MB-PLA'}],
  mccCategories:[{id:'food',name:'Ăn uống',codes:['5812']}],
  cashbackPrograms:[{
    id:'p',cardProductId:'card',name:'Main',conditionMode:'supporting',totalSpendMinimum:5000000,
    packages:[{id:'daily',name:'Hằng ngày',groups:[{id:'g1',name:'Ăn uống',conditions:[{id:'c1',name:'Ăn uống',rate:5,max:200000,maxCashbackUnlimited:false,mccCategoryIds:['food'],channel:'Offline',note:'n'}]}]}]
  }]
};

test('cashback export/import reconstructs program package group and condition IDs',()=>{
  const rows=exportHostSheetRows(state,'cashbackPrograms');
  assert.equal(rows.length,1);
  const next=applyHostImportRows({...state,cashbackPrograms:[]},{cashbackPrograms:rows},'upsert');
  assert.equal(next.cashbackPrograms[0].id,'p');
  assert.equal(next.cashbackPrograms[0].packages[0].id,'daily');
  assert.equal(next.cashbackPrograms[0].packages[0].groups[0].conditions[0].id,'c1');
  assert.equal(next.cashbackPrograms[0].conditionMode,'supporting');
  assert.equal(next.cashbackPrograms[0].totalSpendMinimum,5000000);
});

test('derived spend-to-max column never overrides rate/max on import',()=>{
  const rows=exportHostSheetRows(state,'cashbackPrograms').map(row=>({...row,ChiDeDatMaxCB:999}));
  const next=applyHostImportRows({...state,cashbackPrograms:[]},{cashbackPrograms:rows},'upsert');
  const c=next.cashbackPrograms[0].packages[0].groups[0].conditions[0];
  assert.equal(c.rate,5);
  assert.equal(c.max,200000);
});

test('Excel master on Cashback-only workbook preserves unrelated collections',()=>{
  const rows=exportHostSheetRows(state,'cashbackPrograms');
  const next=applyHostImportRows(state,{cashbackPrograms:rows},'master');
  assert.deepEqual(next.customers,state.customers);
  assert.deepEqual(next.cardProducts,state.cardProducts);
  assert.deepEqual(next.mccCategories,state.mccCategories);
});
```

- [ ] **Step 2: Run new Excel tests and verify RED**

```bash
node --test tests/host-excel-cashback-canonical.test.mjs
```

Expected: FAIL because current Host Excel format is legacy-flat.

- [ ] **Step 3: Replace only Cashback sheet serialization/parsing with canonical hierarchy fields**

Cashback export columns must include stable keys for:

```text
CardID
ProgramID
ProgramName
ConditionMode
ProgramTotalSpendMinimum
PackageID
PackageName
GroupID
GroupName
ConditionID
ConditionName
MCC
TransactionMethod
RatePercent
MaxType
MaxCashback
SpendToMax              # readability only
ConditionSpendMinimum
Note
Status
```

Use existing workbook sheet names and global modal workflow; do not fork a second Excel implementation.

- [ ] **Step 4: Group imported condition rows back into canonical programs deterministically**

Grouping order:

```text
ProgramID -> PackageID (optional) -> GroupID (optional) -> ConditionID
```

Rules:

- `ProgramID` is the update key when present.
- Existing program with same ID updates in `update`/`upsert` modes.
- Missing IDs may be synthesized only using the same stable helper used by UI creation.
- `SpendToMax` is ignored on import.
- MCC values resolve against canonical Host MCC IDs/names; unknown MCC must be reported/skipped according to existing Host import error behavior, not silently invented.

- [ ] **Step 5: Preserve global three-mode behavior and partial-sheet master semantics**

Keep `importPass(...)` collection gating: only collections represented by workbook sheets are eligible for master deletion.

- [ ] **Step 6: Run Excel tests**

```bash
node --test \
  tests/host-excel-cashback-canonical.test.mjs \
  tests/host-excel.test.mjs \
  tests/host-excel-ui.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add services/host-excel.js app.js tests/host-excel-cashback-canonical.test.mjs
git commit -m "feat: round trip canonical cashback in excel"
```

---

### Task 6: Package-aware persistence and runtime compatibility regression pass

**Files:**
- Modify only if tests prove necessary: `services/local-repository.js`, `services/default-data.js`, `services/cashback-progress.js`, `services/order-coordination.js`, `services/matrix-engine.js`
- Test: `tests/cashback-package-host-compatibility.test.mjs`
- Test: existing persistence/runtime tests

**Interfaces:**
- Consumes: canonical model, adapter, editor and Excel from Tasks 1–5.
- Produces: end-to-end guarantee that package data survives save/load and Host runtime still produces coordination/matrix rows without bank/card hard coding.

- [ ] **Step 1: Write failing end-to-end compatibility test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalize} from '../services/local-repository.js';
import {runtimeCashbackPrograms} from '../services/cashback-runtime-adapter.js';
import {buildCoordinationRows} from '../services/order-coordination.js';

// Build a minimal state with one customer/card/product, one package program,
// one MCC and no transactions. Assert canonicalize(canonicalize(state)) is stable,
// packages remain present, runtime rules are emitted, and coordination rows exist.
```

Also assert no runtime field or conditional checks for literal card names such as `MB Pla`.

- [ ] **Step 2: Run the test and verify RED only if a real gap exists**

```bash
node --test tests/cashback-package-host-compatibility.test.mjs
```

If PASS immediately, do not modify production files; retain the regression test and proceed.

- [ ] **Step 3: Fix only proven compatibility gaps**

Examples of allowed fixes:

- repository drops `packages[]`;
- runtime adapter not invoked by one entry point;
- matrix label dereferences legacy parent fields;
- default-data canonicalization strips new fields.

Do not refactor unrelated calculations.

- [ ] **Step 4: Run persistence/runtime regression set**

```bash
node --test \
  tests/cashback-package-host-compatibility.test.mjs \
  tests/cashback-coordination.test.mjs \
  tests/cashback-spend-targets.test.mjs \
  tests/cashback-exclusive.test.mjs \
  tests/matrix.test.mjs \
  tests/empty-data-bootstrap.test.mjs \
  tests/host-v2.test.mjs
```

Expected: PASS except baseline failures already proven to exist before this feature; any baseline failure must be named explicitly in the final report.

- [ ] **Step 5: Commit**

```bash
git add services tests/cashback-package-host-compatibility.test.mjs
git commit -m "test: protect host cashback package compatibility"
```

---

### Task 7: Remove obsolete Host cashback table/modal paths and verify 1:1 interaction contract

**Files:**
- Modify: `app.js`
- Modify: `services/cashback-program-editor.js` or remove its usage if fully obsolete
- Modify: `services/cashback-feature-ui.js` only where table-only exports are now dead
- Modify: `styles.css`
- Test: `tests/cashback-client-parity-contract.test.mjs`
- Update/remove only obsolete tests that assert the removed table/modal UI

**Interfaces:**
- Consumes: completed Client-parity editor path.
- Produces: exactly one Host Cashback editor workflow; no duplicate old modal/table CRUD path remains reachable.

- [ ] **Step 1: Write contract test that rejects old table/modal-only markers and requires the new workflow**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles.css',import.meta.url),'utf8');

test('Host cashback view is wired to Client-parity workflow, not legacy entity table CRUD',()=>{
  assert.match(app,/renderCashbackProgramPage/);
  assert.match(app,/cashbackProgramSelection/);
  assert.doesNotMatch(app,/openCashbackProgramEditor\(/);
  assert.match(css,/\.cashback-program-layout/);
  assert.match(css,/\.cashback-program-structure/);
});
```

- [ ] **Step 2: Run contract test and verify RED while old path is still referenced**

```bash
node --test tests/cashback-client-parity-contract.test.mjs
```

- [ ] **Step 3: Remove only dead Cashback UI wiring**

- Remove old `entityTable`-based Cashback rendering and modal action bindings.
- Keep reusable business helpers still used by adapter/runtime tests.
- If `services/cashback-program-editor.js` becomes unused, leave the file only if another test/import still needs it; otherwise remove it and replace obsolete tests with parity tests.
- Remove dead CSS selectors specific only to the legacy Cashback table/modal if they are no longer referenced.

- [ ] **Step 4: Verify no duplicate listener/wiring remains**

Search:

```bash
grep -RniE "openCashbackProgramEditor|data-entity=.?cashback|cashback-program-table" app.js services styles.css tests
```

Expected: only intentional legacy fixtures/docs if any; no reachable app path.

- [ ] **Step 5: Run cashback UI/business test set**

```bash
node --test tests/cashback-*.test.mjs tests/host-excel*.test.mjs
```

Expected: PASS except documented pre-existing baseline failures unrelated to Cashback parity.

- [ ] **Step 6: Commit**

```bash
git add app.js services styles.css tests
git commit -m "refactor: remove legacy host cashback editor"
```

---

### Task 8: Full verification, baseline comparison and distributable ZIP

**Files:**
- Modify only if verification finds a regression attributable to this work.
- Output: `CardFlow_Host(20260922-cashback-client-parity).zip`

**Interfaces:**
- Consumes: all previous tasks.
- Produces: verified source package and exact pass/fail report.

- [ ] **Step 1: Run syntax checks on every changed JS module**

```bash
node --check app.js
node --check services/cashback-canonical.js
node --check services/cashback-program-config.js
node --check services/cashback-runtime-adapter.js
node --check services/host-excel.js
node --check services/local-repository.js
node --check services/order-coordination.js
node --check services/matrix-engine.js
node --check services/cashback-progress.js
```

Expected: all exit 0.

- [ ] **Step 2: Run the entire Host test suite fresh**

```bash
node --test tests/*.test.mjs
```

Record exact `pass`, `fail`, `skipped` counts. Do not claim full green unless output says `fail 0`.

- [ ] **Step 3: Compare any failures against the pre-feature Host baseline**

Use the previously recorded baseline from `CardFlow_Host(20260921-excel-cashback)` and rerun the corresponding original source if necessary. Any failure newly introduced by this feature must be fixed before packaging. Pre-existing failures may remain only if they are reproduced on baseline and named in the report.

- [ ] **Step 4: Run focused acceptance searches/checks**

```bash
grep -Rni "MB Pla" services app.js tests || true
grep -RniE "cashback-program-layout|data-cashback-card-select|data-cashback-program-select|data-cashback-package-select|data-save-program" app.js services/cashback-program-config.js styles.css
grep -RniE "runtimeCashbackPrograms|flattenCashbackProgram" services
```

Expected: no generic production hard coding for `MB Pla`; Client-parity selectors and runtime adapter are present.

- [ ] **Step 5: Verify asset cache version consistency**

Check `index.html` and module imports all reference the new cashback parity version token where changed. This prevents the previously observed browser/GitHub Pages stale-asset behavior.

- [ ] **Step 6: Build distributable ZIP from the verified tree**

```bash
cd ..
zip -qr /mnt/data/CardFlow_Host\(20260922-cashback-client-parity\).zip CardFlow_Host
```

- [ ] **Step 7: Report in Vietnamese using project format**

Report exactly:

```text
✅ Đã thực hiện
📁 File đã chỉnh sửa
⚠ Lưu ý
🧪 Trạng thái
```

Include:

- exact test pass/fail/skip counts;
- whether any failures are reproduced on baseline;
- whether `schemaVersion` changed and why;
- canonical -> runtime adapter behavior;
- Excel Cashback round-trip coverage;
- ZIP link.

