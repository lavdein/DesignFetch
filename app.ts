import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { Parser, DomHandler, DomUtils } from "./deps.ts";

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
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36",
      },
    });
    const html = await response.text();
    console.log("HTML fetched:", html.slice(0, 100));

    const getImageUrls = (html: string) => {
      const imageUrls: { url: string; width: number; height: number }[] = [];
      const handler = new DomHandler();
      const parser = new Parser(handler);
      parser.write(html);
      parser.end();
    
      const doc = handler.dom;
    
      if (!doc) {
        throw new Error("Failed to parse HTML");
      }
    
      const imageContainers = DomUtils.findAll((elem) => DomUtils.hasAttrib(elem, "data-grid-item"), doc);
      console.log("Image containers found:", imageContainers.length);
      for (const container of imageContainers) {
        const img = DomUtils.findOne((elem) => elem.name === "img", container);
        if (img) {
          const src = DomUtils.getAttributeValue(img, "src");
          const width = parseInt(DomUtils.getAttributeValue(img, "data-width") || "0");
          const height = parseInt(DomUtils.getAttributeValue(img, "data-height") || "0");
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
