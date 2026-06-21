import dotenv from "dotenv";
import { z } from "zod";

// Load environment variables from .env file
dotenv.config();

const configSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(["development", "staging", "production"]).default("development"),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid connection string URL"),
  JWT_SECRET_KEY: z.string().min(32, "JWT_SECRET_KEY must be at least 32 characters long"),
  JOURNAL_ENC_KEY: z.string().length(64, "JOURNAL_ENC_KEY must be exactly 64 characters (32 bytes hex)"),
  CORS_ORIGINS: z.string().transform((val) => val.split(",").map((s) => s.trim())),
});

// Parse and validate environment variables
const result = configSchema.safeParse(process.env);

if (!result.success) {
  console.error("❌ Configuration validation failed! Please check your environment variables:");
  result.error.issues.forEach((issue) => {
    console.error(`   - ${issue.path.join(".")}: ${issue.message}`);
  });
  process.exit(1);
}

export const config = result.data;
