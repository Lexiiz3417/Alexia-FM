// src/keep_alive.js
import express from "express";

const app = express();
const port = 3000;

app.get("/", (req, res) => {
  res.send("🤖 Alexia FM is alive and well!");
});

export function keepAlive() {
  app.listen(port, () => {
    console.log(`☕ Warung kecil Alexia Project buka di port ${port}`);
  });
}
