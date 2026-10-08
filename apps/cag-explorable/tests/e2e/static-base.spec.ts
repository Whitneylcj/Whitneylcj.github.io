import { test, expect } from '@playwright/test';

// Only run this against the dedicated nested-base production preview.
const nested=process.env.CAG_NESTED_URL;
test('nested static path loads, restores a hash and survives a hard refresh',async({page})=>{
  test.skip(!nested,'Use CAG_NESTED_URL with the /cag-check/ production preview.');
  const errors:string[]=[];
  const badResponses:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  page.on('response',response=>{if(response.status()>=400)badResponses.push(`${response.status()} ${response.url()}`);});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(nested!);
  await expect(page.getByTestId('pooled-action')).toHaveText('0.2175');
  await expect(page.locator('canvas')).toHaveCount(1);
  await page.getByRole('button',{name:'Keep the shape',exact:true}).click();
  await page.getByRole('combobox',{name:'Teaching preset',exact:true}).selectOption('log-amplitude');
  await page.getByTestId('language-select').selectOption('zh');
  await page.getByRole('button',{name:'复制链接',exact:true}).click();
  const copied=await page.getByTestId('share-url').inputValue();
  expect(new URL(copied).pathname).toBe(new URL(nested!).pathname);
  expect(new URL(copied).hash).toContain('cag=1');
  await page.goto(copied);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang','zh-CN');
  await expect(page.getByTestId('selected-link')).toHaveText('对数');
  await expect(page.getByTestId('pooled-action')).toHaveText('0.4900');
  expect(await page.locator('link[rel="icon"]').getAttribute('href')).toBe('/cag-check/favicon.svg');
  expect(errors).toEqual([]);
  expect(badResponses).toEqual([]);
});
