import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

// Load Firebase config
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));

// Initialize Firebase Admin (using default credentials if available, or just the project ID)
// In this environment, we might not have a service account, so we'll try to use the project ID.
try {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
} catch (e) {
  console.error("Firebase Admin initialization failed:", e);
}

const db = getFirestore();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for hidden download
  app.get("/api/download/:collection/:id", async (req, res) => {
    try {
      const { collection, id } = req.params;
      const docRef = db.collection(collection).doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        return res.status(404).send("File not found");
      }

      const data = doc.data();
      const downloadUrl = data?.downloadUrl;

      if (!downloadUrl) {
        return res.status(404).send("Download URL not found");
      }

      console.log(`Proxying download for ${data.name} from ${downloadUrl}`);

      // Fetch and stream the file
      const response = await axios({
        method: "get",
        url: downloadUrl,
        responseType: "stream",
      });

      // Set headers for file download
      const fileName = data.name || "download";
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.setHeader("Content-Type", response.headers["content-type"] || "application/octet-stream");

      response.data.pipe(res);
    } catch (error) {
      console.error("Download proxy error:", error);
      res.status(500).send("Error downloading file");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
