import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { Parser, HtmlElement } from "./deps.ts";

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
    const response = await fetch(url);
    const html = await response.text();
    console.log("HTML fetched:", html.slice(0, 100));

    const getImageUrls = (html: string) => {
      const imageUrls: { url: string; width: number; height: number }[] = [];
      const parser = new Parser(html);
      const doc = parser.parse();

      if (!doc) {
        throw new Error("Failed to parse HTML");
      }

      const imageContainers = doc.querySelectorAll('div[data-grid-item]');
      console.log("Image containers found:", imageContainers.length);
      for (const container of imageContainers) {
        const img = container.querySelector("img") as HtmlElement;
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
    };

    const imageUrls = getImageUrls(html);
    console.log("Image URLs found:", imageUrls.length);
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

console.log("Server running on http://localhost:8000");
await app.listen({ port: 8000 });
