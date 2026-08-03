import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test('check for new tennis tournaments', async ({ page }, testInfo) => {
  await page.goto('https://www.tennistirol.at/turniere');
  await page.getByRole('button', { name: 'Nur essenzielle Cookies' }).click();
  await page.locator('#main').getByText('Allgemeine Klasse', { exact: true }).click();
  await page.locator('#main').getByText('Breitensport').click();
  await page.getByText('+12 Monate').click();
  await page.getByText('Langzeit-Turniere zusätzlich').click();
  await page.getByRole('link', { name: 'Filter anwenden' }).click();

  const tournamentRows = page.locator('.tournamentItem');
  await tournamentRows.first().waitFor({ state: 'visible' });

  // 1. Extract data with a unique ID per tournament
  const currentTournaments = await tournamentRows.evaluateAll((rows) => {
    return rows.map((row) => {
      const name = row.querySelector('.tournament-name-label')?.textContent?.trim() || '';
      const startDate = row.querySelector('.startdate .datefield')?.textContent?.trim() || '';
      const endDate = row.querySelector('.enddate .datefield')?.textContent?.trim() || '';
      const locationNodes = row.querySelectorAll('.tournament-location div');
      const address = Array.from(locationNodes)
        .map((node) => node.textContent?.trim())
        .filter(Boolean)
        .join(', ');

      return {
        id: `${name}_${startDate}`, // Composite key
        name,
        date: `${startDate} - ${endDate}`,
        address,
      };
    });
  });

  // Resolve snapshot file path managed by Playwright
  const snapshotPath = testInfo.snapshotPath('known-tournaments.json');

  // 2. Initialize snapshot if running for the first time
  if (!fs.existsSync(snapshotPath)) {
    fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
    fs.writeFileSync(snapshotPath, JSON.stringify(currentTournaments, null, 2));
    console.log('Created initial baseline snapshot.');
    return;
  }

  // 3. Load previous baseline tournaments
  const previousTournaments: Array<{ id: string }> = JSON.parse(
    fs.readFileSync(snapshotPath, 'utf-8')
  );
  const previousIds = new Set(previousTournaments.map((t) => t.id));

  // 4. Filter for ONLY new additions (ignores items that were removed)
  const newTournaments = currentTournaments.filter((t) => !previousIds.has(t.id));

  // 5. Update baseline and assert
  if (newTournaments.length > 0) {
    // Merge current items into baseline to prevent repeated alerts on next runs
    fs.writeFileSync(snapshotPath, JSON.stringify(currentTournaments, null, 2));
  }

  expect(
    newTournaments,
    `Found ${newTournaments.length} new tournament(s)!\n${JSON.stringify(newTournaments, null, 2)}`
  ).toEqual([]);
});