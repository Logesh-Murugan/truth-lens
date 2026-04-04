import { defineConfig } from "vite";
import { resolve } from "path";
import { copyFileSync, mkdirSync, readdirSync, existsSync } from "fs";

/**
 * Custom plugin to copy static extension files into dist/
 * so that dist/ is a complete, loadable Chrome extension.
 */
function copyExtensionFiles() {
  return {
    name: "copy-extension-files",
    closeBundle() {
      const distDir = resolve(__dirname, "dist");

      if (!existsSync(distDir)) {
        mkdirSync(distDir, { recursive: true });
      }

      // Static files to copy
      const staticFiles = ["manifest.json", "popup.html", "popup.css"];
      for (const file of staticFiles) {
        copyFileSync(resolve(__dirname, file), resolve(distDir, file));
      }

      // Copy icons
      const iconsDir = resolve(__dirname, "icons");
      const distIconsDir = resolve(distDir, "icons");
      if (!existsSync(distIconsDir)) {
        mkdirSync(distIconsDir, { recursive: true });
      }
      if (existsSync(iconsDir)) {
        for (const file of readdirSync(iconsDir)) {
          if (file.endsWith(".png")) {
            copyFileSync(
              resolve(iconsDir, file),
              resolve(distIconsDir, file)
            );
          }
        }
      }

      console.log(
        "✓ Copied manifest.json, popup.html, popup.css, and icons/ to dist/"
      );
    },
  };
}

export default defineConfig({
  plugins: [copyExtensionFiles()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        "src/content": resolve(__dirname, "src/content.ts"),
        "src/background": resolve(__dirname, "src/background.ts"),
        popup: resolve(__dirname, "src/popup.ts"),
      },
      output: {
        format: "es",
        entryFileNames: "[name].js",
      },
    },
    target: "esnext",
    minify: false,
  },
});
