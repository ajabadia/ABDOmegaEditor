import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { injectBlueprint } from './helpers/blueprintInjection';

/**
 * OMEGA ERA 7.2.3 - BLUEPRINT INJECTION E2E TEST SUITE
 * Validates the full blueprint injection pipeline via both the
 * TemplateGallery (toolbar) and BlueprintLibraryPanel (right dock).
 *
 * Blueprints loaded from /blueprints/index.json:
 *   - standard_vcf  → "Industrial VCF"      (container + 1 knob cell)
 *   - stereo_io     → "Stereo I/O Block"     (container + 2 port cells)
 *   - osc_macro_block → "VCO Macro Block"    (container + label + knob + port)
 *   - performance_8_grid → "Perf. 8-Grid"    (nested containers + 8 knob cells)
 *
 * Toolbar-gallery → injection flow is delegated to the shared helper
 * `e2e/helpers/blueprintInjection.ts` (Fix candidato C from v9.1.8-dev addendum).
 * This file only retains navigation, cell-counting and the alternative-flow
 * helpers needed by tests 6 (cancel) and 7 (right-dock panel).
 */

test.describe('Blueprint Injection', () => {

  /** Shared helper: navigate & switch to rack view */
  async function navigateToRack(page: Page) {
    await page.goto('/en');
    await page.waitForTimeout(4000);

    const rackTab = page.locator('header').getByRole('button', { name: 'Virtual Rack', exact: true });
    if (await rackTab.isVisible()) {
      await rackTab.click();
      await page.waitForTimeout(2000);
    }
  }

  /**
   * Local helper: open the TemplateGallery without injecting.
   * Only used by test 6 (cancel-flow), which exercises a different code path
   * (Cancel button instead of blueprint card click).
   */
  async function openGalleryFromToolbar(page: Page) {
    const galleryBtn = page.locator('button[title="Blueprints & Templates (B)"]');
    await expect(galleryBtn).toBeVisible({ timeout: 5000 });
    await galleryBtn.click();
    await page.waitForTimeout(800);
  }

  /** Shared helper: open the BlueprintLibraryPanel in the right dock (used by test 7) */
  async function openBlueprintPanel(page: Page) {
    // Canonical marker: the panel's search input (placeholder from BlueprintLibraryPanel.tsx)
    const searchInput = page.locator('input[placeholder="Search blueprints..."]');
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      return; // already open
    }

    // Toggle via the DockIconStrip button (Zap icon, title="Blueprint Library").
    // This is the canonical toggle for window_blueprints and is independent of the
    // MenuBar "Window" dropdown which was unreliable in the pre-existing test.
    const bpDockIcon = page.locator('button[title="Blueprint Library"]');
    await expect(bpDockIcon).toBeVisible({ timeout: 5000 });
    await bpDockIcon.click();

    // Final wait for the canonical panel content
    await expect(searchInput).toBeVisible({ timeout: 5000 });
  }

  /** Count cells currently in the rack */
  async function countRackCells(page: Page): Promise<number> {
    return page.locator('.uca-node.uca-cell').count();
  }

  // ─── TESTS ──────────────────────────────────────────────────────

  test.beforeEach(async ({ page }) => {
    await navigateToRack(page);
  });

  test('1. should open gallery and inject "Industrial VCF" blueprint', async ({ page }) => {
    // Verify rack has initial cells
    const initialCellCount = await countRackCells(page);

    // Open gallery → click "Industrial VCF" card → wait for cell → wait for close
    await injectBlueprint(page);

    // Verify new cells appeared (VCF adds 1 knob cell: cutoff_cell)
    const newCellCount = await countRackCells(page);
    expect(newCellCount).toBeGreaterThan(initialCellCount);

    // Verify the VCF container node is rendered
    const vcfContainer = page.locator('.uca-node.uca-container').first();
    await expect(vcfContainer).toBeVisible({ timeout: 5000 });
  });

  test('2. should inject "Stereo I/O Block" and verify stereo ports', async ({ page }) => {
    const initialCellCount = await countRackCells(page);

    await injectBlueprint(page, { blueprintLabel: 'Stereo I/O Block' });

    // Stereo I/O adds 2 port cells (in_l_cell, in_r_cell)
    const newCellCount = await countRackCells(page);
    expect(newCellCount).toBeGreaterThanOrEqual(initialCellCount + 2);
  });

  test('3. should inject "Performance 8-Grid" with all 8 knob cells', async ({ page }) => {
    const initialCellCount = await countRackCells(page);

    await injectBlueprint(page, { blueprintLabel: 'Performance 8-Grid' });

    // The 8-Grid adds 8 knob cells (m1..m8) inside nested containers
    const cellCount = await countRackCells(page);
    expect(cellCount).toBeGreaterThanOrEqual(initialCellCount + 8);

    // The grid also creates container nodes (col_1, col_2, macro_grid_8)
    const containerCount = await page.locator('.uca-node.uca-container').count();
    expect(containerCount).toBeGreaterThanOrEqual(3); // macro_grid_8 + col_1 + col_2
  });

  test('4. should inject multiple blueprints sequentially', async ({ page }) => {
    // Inject VCF first
    await injectBlueprint(page);

    const afterFirst = await countRackCells(page);

    // Inject Stereo I/O second
    await injectBlueprint(page, { blueprintLabel: 'Stereo I/O Block' });

    const afterSecond = await countRackCells(page);

    // Both injections should have added cells
    expect(afterSecond).toBeGreaterThan(afterFirst);
    expect(afterFirst).toBeGreaterThan(0);

    // Verify at least 3 cells now (rough check: 1 from VCF + 2 from Stereo I/O + initial)
    expect(afterSecond).toBeGreaterThanOrEqual(3);
  });

  test('5. should inject "VCO Macro Block" with complex structure', async ({ page }) => {
    const initialCellCount = await countRackCells(page);

    await injectBlueprint(page, { blueprintLabel: 'VCO Macro Block' });

    // VCO adds 2 cells (pitch_knob + fm_jack)
    const cellCount = await countRackCells(page);
    expect(cellCount).toBeGreaterThanOrEqual(initialCellCount + 2);

    // VCO also adds a container (vco_block) and potentially an asset-layer (vco_label)
    const containerCount = await page.locator('.uca-node.uca-container').count();
    expect(containerCount).toBeGreaterThanOrEqual(1);
  });

  test('6. should open/close gallery without affecting rack state', async ({ page }) => {
    // Cancel flow — does NOT use injectBlueprint (no blueprint card is clicked).
    // Count cells before opening gallery
    const cellsBefore = await countRackCells(page);

    // Open gallery
    await openGalleryFromToolbar(page);
    // The text "Blueprint Gallery" matches BOTH the modal <h2> and a "Blueprint Gallery Inject" button
    // in the toolbar. Use the h2 role to disambiguate (strict mode-safe).
    const galleryHeading = page.getByRole('heading', { name: 'Blueprint Gallery' });
    await expect(galleryHeading).toBeVisible({ timeout: 5000 });

    // Wait for gallery blueprints to load (loading spinner to disappear)
    await page.waitForTimeout(3000);

    // Close gallery via Cancel button (in footer, visible after loading)
    const cancelBtn = page.locator('button', { hasText: 'Cancel Selection' }).first();
    await expect(cancelBtn).toBeVisible({ timeout: 10000 });
    await cancelBtn.click();
    await page.waitForTimeout(800);

    // Verify gallery is closed
    await expect(galleryHeading).not.toBeVisible({ timeout: 5000 });

    // Verify rack state is unchanged
    const cellsAfter = await countRackCells(page);
    expect(cellsAfter).toBe(cellsBefore);
  });

  test('7. should inject from BlueprintLibraryPanel in the right dock', async ({ page }) => {
    // Right-dock panel flow — uses a different selector and click handler,
    // not the toolbar gallery, so injectBlueprint does not apply here.
    const initialCellCount = await countRackCells(page);

    // Open the BlueprintLibraryPanel
    await openBlueprintPanel(page);

    // Find the "Industrial VCF" blueprint entry in the panel
    const vcfEntry = page.locator('.cursor-pointer', { hasText: 'Industrial VCF' }).first();
    await expect(vcfEntry).toBeVisible({ timeout: 5000 });
    await vcfEntry.click();

    // Wait for the blueprint injection to complete and cells to appear in the rack
    await expect.poll(async () => countRackCells(page), { timeout: 5000 }).toBeGreaterThan(initialCellCount);
  });

  test('8. should render new cells as interactive (click-to-select after injection)', async ({ page }) => {
    // Inject VCF
    await injectBlueprint(page);

    // Find the injected cell (the VCF adds cutoff_cell with cyan color #00f2ff)
    const firstCell = page.locator('.uca-node.uca-cell').first();
    await expect(firstCell).toBeVisible({ timeout: 5000 });

    // Click to select. Use force:true to bypass framer-motion's pan/click arbitration
    // (the cell has both onClick and onPanStart in ENGINEERING mode, which can
    // suppress onClick on micro-movements).
    await firstCell.click({ force: true });

    // Verify selection outline deterministically with expect.poll. The outline
    // update is triggered by React state propagation (onSelect -> reducer -> re-render),
    // so a poll is safer than a fixed waitForTimeout(500).
    await expect.poll(async () =>
      firstCell.evaluate(el => getComputedStyle(el).outline),
      { timeout: 5000, intervals: [100, 200, 500] }
    ).toContain('rgb(0, 242, 255)');
  });
});
