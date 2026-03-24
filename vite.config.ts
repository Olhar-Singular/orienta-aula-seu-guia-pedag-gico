import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const fallbackProjectId = "pvqjooezhoomtpymfiea";
  const fallbackPublishableKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2cWpvb2V6aG9vbXRweW1maWVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3OTMwMzYsImV4cCI6MjA4OTM2OTAzNn0.DK-3_MR7Z1D6Xtofjh4lnh8be0J1E-23KB0xYicUWUY";

  const projectId = env.VITE_SUPABASE_PROJECT_ID || fallbackProjectId;
  const supabaseUrl = env.VITE_SUPABASE_URL || `https://${projectId}.supabase.co`;
  const supabasePublishableKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY || fallbackPublishableKey;

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabasePublishableKey),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(projectId),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "@tanstack/react-query", "@radix-ui/react-tooltip"],
    },
    optimizeDeps: {
      include: ["@tanstack/react-query"],
    },
  };
});
