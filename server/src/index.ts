import { app } from './app.js';
import { env } from './config/env.js';

app.listen(env.port, () => {
  console.log(`PEDDI API em http://localhost:${env.port}`);
});
