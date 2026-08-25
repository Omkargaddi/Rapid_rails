import dotenv from 'dotenv';
dotenv.config();

import createApp from './app.js';

const app = await createApp({ mode: 'async' });

app.listen(process.env.PORT, () =>
    console.log(`[server-async] running on port ${process.env.PORT}`)
);