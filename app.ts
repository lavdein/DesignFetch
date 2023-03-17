import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";

const BROWSERLESS_TOKEN = Deno.env.get("BROWSERLESS_TOKEN");
if (!BROWSERLESS_TOKEN) {
  throw new Error("Missing BROWSERLESS_TOKEN environment variable");
}

const app = new Application();
const router = new Router();

router.get("/", async (context) => {
  const browser = await puppeteer.connect({
    browserWSEndpoint: `wss://chrome.browserless.io?token=${BROWSERLESS_TOKEN}`,
  });

  const page = await browser.newPage();
  await page.goto("https://example.com");
  const pageTitle = await page.title();
  await browser.close();

  context.response.body = `Title of the page is: ${pageTitle}`;
});

app.use(router.routes());
app.use(router.allowedMethods());

const port = Number(Deno.env.get("PORT")) || 8000;
console.log(`Server running on http://localhost:${port}`);
await app.listen({ port });