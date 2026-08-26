import dotenv from 'dotenv';
dotenv.config();

import createApp from './app.js';

const app = await createApp({ mode: 'all' });

app.listen(process.env.PORT, () =>
    console.log(`[server] all-in-one running on port ${process.env.PORT}`)
);
