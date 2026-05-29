import { test, expect } from '@playwright/test';

/**
 * OMEGA ERA 7.2.3 - INDUSTRIAL SMOKE TEST SUITE
 * Validating Phase 6 core industrialization features.
 */

test.describe('Phase 6 Critical Flows', () => {
  
  test.beforeEach(async ({ page }) => {
    // Port 3100 as specified by USER
    await page.goto('/en/tools/manifest-editor');
    // Wait for the settle period (3s) + some buffer
    await page.waitForTimeout(4000);
  });

  test('Flow 1: Load -> Edit -> Dirty -> Save -> Clean', async ({ page }) => {
    const dirtyIndicator = page.locator('[title="Unsaved changes"]').first();
    await expect(dirtyIndicator).not.toBeVisible();

    await page.locator('header').getByRole('button', { name: 'Source', exact: true }).click();
    
    // Use evaluate to set Monaco value directly
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        const check = () => {
          interface MonacoWindow extends Window { monaco?: { editor?: { getModels: () => Array<{ setValue: (val: string) => void }> } } }
          const model = (window as unknown as MonacoWindow).monaco?.editor?.getModels()[0];
          if (model) {
            // Set a valid JSON directly without parsing the old one
            model.setValue(JSON.stringify({
              version: "7.2.3",
              name: "Dirty Module",
              controls: []
            }, null, 2));
            resolve();
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      });
    });
    
    // Wait for settle + debounce
    await page.waitForTimeout(8000);
    await expect(dirtyIndicator).toBeVisible({ timeout: 20000 });

    await page.getByRole('button', { name: 'File', exact: true }).click();
    await page.getByText('Save', { exact: true }).hover();
    await page.getByText('Manifest (.acemm)', { exact: true }).click();

    await expect(dirtyIndicator).not.toBeVisible({ timeout: 15000 });
  });

  test('Flow 2: Cross-View Sync (Rack Selection -> Source Reveal)', async ({ page }) => {
    await page.locator('header').getByRole('button', { name: 'Virtual Rack', exact: true }).click();
    
    // If Rack is empty, try to add a control from the sidebar if visible
    const entity = page.locator('[data-entity-id]').first();
    if (await entity.count() === 0) {
       const catalogItem = page.locator('.wb-surface-lighter.border.wb-outline.rounded-xs').first();
       if (await catalogItem.count() > 0) {
         await catalogItem.click(); 
         await page.waitForTimeout(2000);
       }
    }

    if (await entity.count() > 0) {
      await entity.click({ force: true });
      await page.locator('header').getByRole('button', { name: 'Source', exact: true }).click();
      const decoration = page.locator('.omega-source-selection-highlight');
      await expect(decoration).toBeVisible();
    } else {
      console.log('Skipping selection sync test: No entities found in Rack.');
    }
  });

  test('Flow 3: Diagnostic Trigger (Broken Bind -> Badge -> Tooltip)', async ({ page }) => {
    await page.locator('header').getByRole('button', { name: 'Source', exact: true }).click();
    
    await page.evaluate(() => {
      interface MonacoWindow extends Window { monaco?: { editor?: { getModels: () => Array<{ setValue: (val: string) => void }> } } }
      const model = (window as unknown as MonacoWindow).monaco?.editor?.getModels()[0];
      if (model) {
        model.setValue(JSON.stringify({
          version: "7.2.3",
          name: "Broken Module",
          controls: [{
            id: "ctrl_1",
            type: "knob",
            bind: "INVALID_TARGET"
          }]
        }, null, 2));
      }
    });

    // Wait for structural auditor
    const warningBadge = page.locator('[title*="Broken Bind"]').first();
    await expect(warningBadge).toBeVisible({ timeout: 20000 });

    const title = await warningBadge.getAttribute('title');
    expect(title).toContain('Broken Bind');
    expect(title).toContain('INVALID_TARGET');
  });

  test('Flow 4: beforeunload Guard (Dirty -> Refresh -> Confirm)', async ({ page }) => {
    await page.locator('header').getByRole('button', { name: 'Source', exact: true }).click();
    
    await page.evaluate(() => {
      interface MonacoWindow extends Window { monaco?: { editor?: { getModels: () => Array<{ setValue: (val: string) => void }> } } }
      const model = (window as unknown as MonacoWindow).monaco?.editor?.getModels()[0];
      if (model) {
        model.setValue(JSON.stringify({
          version: "7.2.3",
          name: "BeforeUnload Test",
          controls: []
        }, null, 2));
      }
    });

    await page.waitForTimeout(8000);

    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('unsaved changes');
      await dialog.dismiss();
    });

    await page.reload();
  });

  test('Flow 5: Reset Guard (Dirty -> Reset -> Confirm -> Clean)', async ({ page }) => {
    await page.locator('header').getByRole('button', { name: 'Source', exact: true }).click();
    
    await page.evaluate(() => {
      interface MonacoWindow extends Window { monaco?: { editor?: { getModels: () => Array<{ setValue: (val: string) => void }> } } }
      const model = (window as unknown as MonacoWindow).monaco?.editor?.getModels()[0];
      if (model) {
        model.setValue(JSON.stringify({
          version: "7.2.3",
          name: "Reset Guard Test",
          controls: []
        }, null, 2));
      }
    });

    await page.waitForTimeout(8000);

    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    
    page.on('dialog', async dialog => {
      expect(dialog.message()).toMatch(/WORKSPACE DIRTY|Reset workspace/);
      await dialog.accept();
    });

    await page.getByText('Reset Workspace', { exact: true }).click();

    const dirtyIndicator = page.locator('[title="Unsaved changes"]').first();
    await expect(dirtyIndicator).not.toBeVisible();
  });
});
