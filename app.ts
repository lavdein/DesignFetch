// server.ts
import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { parse, HTMLElement } from "./deps.ts";

const app = new Application();
const router = new Router();

const fetchProject = async (url: string) => {
  try {
    const response = await fetch(url);
    const html = await response.text();

    const getImageUrls = (html: string) => {
      const imageUrls: { url: string; width: number; height: number }[] = [];
      const dom = parse(html);

      const imageContainers = dom.querySelectorAll(".js-grid-image");
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
    };

    const imageUrls = getImageUrls(html);
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
