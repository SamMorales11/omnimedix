import { handle } from "hono/vercel";
import { app } from "../src/app";

// Handler adaptor untuk Vercel Serverless Function
export const handler = handle(app);

// Export default app untuk Vercel Serverless Functions
export default app;
