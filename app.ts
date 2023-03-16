import { Application, Router, chromium } from "./deps.ts";

const isValidBehanceUrl = (url: string) => {
  const regex = /^https?:\/\/(www\.)?behance\.net\/gallery\/\d+\/[-\w]+/;
  return regex.test(url);
};

const router = new Router();
router.post("/fetch_project", async (context) => {
  const body = await context.request.body().value;
  const projectUrl = body.url;

  if (!projectUrl || !isValidBehanceUrl(projectUrl)) {
    context.response.status = 400;
    context.response.body = { error: "Invalid or missing project URL" };
    return;
  }

  try {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.setViewportSize({
      width: 1280,
      height: 800,
      deviceScaleFactor: 2,
    });

    await page.goto(projectUrl);
    await autoScroll(page);

    const imageUrls = await page.$$eval(
      ".Project-projectModuleContainer-BtF.Preview__project--topMargin.e2e-Project-module-container.project-module-container img",
      (imgs) =>
        imgs.map((img) => ({
          url: img.src,
          width: img.naturalWidth,
          height: img.naturalHeight,
        })),
    );

    await browser.close();

    context.response.status = 200;
    context.response.body = { imageUrls };
  } catch (error) {
    console.error("Error fetching project:", error);
    context.response.status = 500;
    context.response.body = { error: "Internal server error" };
  }
});

async function autoScroll(page: any) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

console.log("Server running on http://localhost:8000");
await app.listen({ port: 8000 });