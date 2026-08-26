import dotenv from 'dotenv';
dotenv.config();

import createApp from './app.js';

const app = await createApp({ mode: 'sync' });

app.listen(process.env.PORT, () =>
    console.log(`[server-sync] running on port ${process.env.PORT}`)
);
