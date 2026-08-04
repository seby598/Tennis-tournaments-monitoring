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

  // 1. Extract ONLY the tournament names into an array of strings
  const currentTournaments = await tournamentRows.evaluateAll((rows) => {
    return rows
      .map((row) => row.querySelector('.tournament-name-label')?.textContent?.trim() || '')
      .filter((name) => name !== ''); // Filter out any empty strings just in case
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

  // 3. Load previous baseline tournament names (now just an array of strings)
  const previousTournaments: string[] = JSON.parse(
    fs.readFileSync(snapshotPath, 'utf-8')
  );
  const previousNames = new Set(previousTournaments);

  // 4. Filter for ONLY new additions by checking the name
  const newTournaments = currentTournaments.filter((name) => !previousNames.has(name));

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