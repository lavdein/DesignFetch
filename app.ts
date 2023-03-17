import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";

const BROWSERLESS_TOKEN = Deno.env.get("BROWSERLESS_TOKEN");
if (!BROWSERLESS_TOKEN) {
  throw new Error("Missing BROWSERLESS_TOKEN environment variable");
}

const app = new Application();
const router = new Router();

// Add CORS middleware
app.use(async (context, next) => {
  context.response.headers.set("Access-Control-Allow-Origin", "*");
  context.response.headers.set(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Range"
  );
  context.response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  context.response.headers.set("Access-Control-Allow-Credentials", "true");
  if (context.request.method === "OPTIONS") {
    context.response.status = 200;
  } else {
    await next();
  }
});

const fetchProject = async (url: string) => {
  try {
    console.log("Fetching URL:", url);
    const browser = await puppeteer.connect({
      browserWSEndpoint: `wss://chrome.browserless.io?token=${BROWSERLESS_TOKEN}`,
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });

    const getImageUrls = async () => {
      return await page.evaluate(() => {
        const imageUrls = [];
        const imageContainers = document.querySelectorAll('.Project-projectModuleContainer-BtF.Preview__project--topMargin.e2e-Project-module-container.project-module-container img');
        console.log("Image containers found:", imageContainers.length);
        for (const container of imageContainers) {
          const img = container.querySelector("img");
          if (img) {
            const src = img.getAttribute("src");
            const width = parseInt(img.getAttribute("data-width") || "0");
            const height = parseInt(img.getAttribute("data-height") || "0");
            if (src) {
              imageUrls.push({ url: src, width, height });
            }
          }
        }
        return imageUrls;
      });
    };

    const imageUrls = await getImageUrls();
    console.log("Image URLs found:", imageUrls.length);
    await browser.close();
    return { imageUrls };
  } catch (error) {
    console.error("Error fetching project:", error);
    throw new Error("Failed to fetch project");
  }
};

router.post("/fetch_project", async (context) => {
  try {
    const { url } = await context.request.body().value;
    const { imageUrls } = await fetchProject(url);
    context.response.body = { imageUrls };
  } catch (error) {
    console.error("Error in fetch_project:", error);
    context.response.status = 500;
    context.response.body = { error: "Failed to fetch project" };
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

const port = Number(Deno.env.get("PORT")) || 8000;
console.log(`Server running on http://localhost:${port}`);
await app.listen({ port });
