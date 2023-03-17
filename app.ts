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

const autoScroll = async (page: puppeteer.Page) => {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
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
};

const fetchProject = async (url: string) => {
  try {
    console.log("Fetching URL:", url);
    const browser = await puppeteer.connect({
      browserWSEndpoint: `wss://chrome.browserless.io?token=${BROWSERLESS_TOKEN}`,
    }).catch((error) => {
      console.error("Error connecting to browserless:", error);
      throw new Error("Failed to connect to browserless");
    });

    const page = await browser.newPage().catch((error) => {
      console.error("Error opening a new page:", error);
      throw new Error("Failed to open a new page");
    });

    await page.goto(url, { waitUntil: "networkidle2" }).catch((error) => {
      console.error("Error navigating to the URL:", error);
      throw new Error("Failed to navigate to the URL");
    });

    await autoScroll(page); // Add auto-scrolling function

    const getImageUrls = async () => {
      return await page.evaluate(() => {
        // Вывод всего HTML-документа
        console.log("HTML content:", document.documentElement.outerHTML);

        const imageUrls = [];
        const imageContainers = document.querySelectorAll('.Project-module-imageContainer img');
        console.log("Image containers found:", imageContainers.length);
        for (const img of imageContainers) {
          console.log("Inspecting container:", img);
          const src = img.getAttribute("src");
          const width = parseInt(img.getAttribute("data-width") || "0");
          const height = parseInt(img.getAttribute("data-height") || "0");

          console.log("Found image with src:", src);
          console.log("Image width:", width);
          console.log("Image height:", height);

          if (src) {
            imageUrls.push({ url: src, width, height });
          }
        }
        return imageUrls; // Переместите return сюда
      }).catch((error) => {
        console.error("Error executing getImageUrls:", error);
        throw new Error("Failed to execute getImageUrls");
      });
    };


    const imageUrls = await getImageUrls();
    console.log("Image URLs found:", imageUrls.length);
    await browser.close().catch((error) => {
      console.error("Error closing browser:", error);
      throw new Error("Failed to close browser");
    });
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