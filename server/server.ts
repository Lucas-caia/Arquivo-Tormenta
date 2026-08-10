import { createApp } from "./app.js";
import { config } from "./config.js";

createApp().listen(config.port, () => {
  console.log(`Arquivo Tormenta RPG em http://localhost:${config.port}`);
});
