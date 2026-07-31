import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://www.tennistirol.at/turniere');
  await page.getByRole('button', { name: 'Nur essenzielle Cookies' }).click();
  await page.locator('#main').getByText('Allgemeine Klasse', {exact: true}).click();
  await page.locator('#main').getByText('Breitensport').click();
  await page.getByText('+12 Monate').click();
  await page.getByText('Langzeit-Turniere zusätzlich').click();
  await page.getByRole('link', { name: 'Filter anwenden' }).click();

// 1. Locate all tournament rows
  const tournamentRows = page.locator('.tournamentItem');

  await tournamentRows.first().waitFor({ state: 'visible' });

  // 2. Extract the data into an array of objects
  const currentTournaments = await tournamentRows.evaluateAll((rows) => {
    return rows.map((row) => {
      // Safely extract text content, defaulting to empty string if missing
      const name = row.querySelector('.tournament-name-label')?.textContent?.trim() || '';
      
      // Get the start and end dates
      const startDate = row.querySelector('.startdate .datefield')?.textContent?.trim() || '';
      const endDate = row.querySelector('.enddate .datefield')?.textContent?.trim() || '';
      
      // Get the location / address
      const locationNodes = row.querySelectorAll('.tournament-location div');
      const address = Array.from(locationNodes)
        .map(node => node.textContent?.trim())
        .filter(text => text) // Remove empty nodes
        .join(', '); 

      return {
        name,
        date: `${startDate} - ${endDate}`,
        address
      };
    });
  });

  // 3. Convert the array to a nicely formatted JSON string
  const tournamentsJson = JSON.stringify(currentTournaments, null, 2);

  // 4. Compare against the previous run's snapshot
  expect(tournamentsJson).toMatchSnapshot('tournaments-list.json');

});