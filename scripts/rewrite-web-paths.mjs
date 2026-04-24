#!/usr/bin/env node
/**
 * Post-build script: rewrites STATIC ASSET paths in web-build HTML files
 * to include /api prefix so they route through the gateway to Express.
 * 
 * The Manus deployment gateway only routes /api/* to Express.
 * All other paths go to a static CDN that has no files.
 * 
 * IMPORTANT: Only rewrite asset paths (_expo, favicon).
 * Do NOT rewrite navigation hrefs — Expo Router handles those at runtime
 * via EXPO_BASE_URL which is baked into the JS bundle.
 */
import fs from "fs";
import path from "path";

const WEB_BUILD = path.resolve(process.cwd(), "web-build");

function rewriteHtml(filePath) {
  let content = fs.readFileSync(filePath, "utf-8");
  
  // Rewrite absolute paths to _expo assets: /_expo/ -> /api/_expo/
  content = content.replace(/(["'])(\/_expo\/)/g, '$1/api/_expo/');
  
  // Rewrite favicon references
  content = content.replace(/(["'])(\/favicon\.ico)(["'])/g, '$1/api/favicon.ico$3');
  content = content.replace(/(["'])(\/favicon\.png)(["'])/g, '$1/api/favicon.png$3');
  
  // Rewrite src paths for scripts that point to /_expo
  // (already covered above, but just in case there are other absolute src paths to assets)
  
  fs.writeFileSync(filePath, content, "utf-8");
  console.log(`Rewrote: ${filePath}`);
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (entry.name.endsWith(".html")) {
      rewriteHtml(fullPath);
    }
  }
}

// Also rewrite JS bundle to fix async chunk loading paths
function rewriteJs(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      rewriteJs(fullPath);
    } else if (entry.name.endsWith(".js") && fullPath.includes("_expo/static/js")) {
      let content = fs.readFileSync(fullPath, "utf-8");
      // Fix async chunk loading paths (dynamic imports)
      if (content.includes('"/_expo/')) {
        content = content.replace(/"\/_expo\//g, '"/api/_expo/');
        fs.writeFileSync(fullPath, content, "utf-8");
        console.log(`Rewrote JS: ${fullPath}`);
      }
    }
  }
}

console.log("Rewriting web-build asset paths for /api gateway...");
walkDir(WEB_BUILD);
rewriteJs(WEB_BUILD);
console.log("Done!");
