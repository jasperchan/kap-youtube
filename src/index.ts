import { youtube } from "@googleapis/youtube";
import { authorize } from "./lib/google.js";
import fs from "fs";
import path from "path";
import open from "open";

interface KapConfigItem {
  title: string;
  type: string;
  default?: string;
  required: boolean;
  enum?: string[];
}

interface KapContext<
  Config extends Record<string, KapConfigItem> = Record<string, KapConfigItem>
> {
  format: string;
  defaultFileName: string;
  filePath: () => Promise<string>;
  config: {
    get(key: keyof Config): string | undefined;
    set(key: keyof Config, value: any): void;
  };
  request: () => void;
  notify: (text: string, cb?: () => void) => void;
  copyToClipboard: (text: string) => void;
  setProgress: (text: string, percentage: number) => void;
  openConfigFile: () => void;
  cancel: () => void;
}

const config = {
  client: {
    required: true,
    title: "OAuth Client JSON",
    type: "string",
  },
  visibility: {
    default: "private",
    required: false,
    title: "Visibility",
    type: "string",
    enum: ["private", "public", "unlisted"],
  },
  credentials: {
    title: "OAuth Credentials",
    type: "string",
    required: false,
  },
} satisfies Record<string, KapConfigItem>;

export const shareServices = [
  {
    title: "Upload to YouTube",
    configDescription:
      "Create a desktop OAuth 2.0 client ID in the Google Cloud Console (https://console.developers.google.com/apis/credentials).",
    formats: ["mp4"],
    config,
    action: async (context: KapContext<typeof config>) => {
      const filePath = await context.filePath();
      const client = JSON.parse(context.config.get("client")!);
      const credentials = context.config.get("credentials");
      const auth = await authorize({
        client,
        scopes: ["https://www.googleapis.com/auth/youtube.upload"],
        async save(credentials) {
          context.config.set("credentials", JSON.stringify(credentials));
        },
        async load() {
          return credentials ? JSON.parse(credentials) : undefined;
        },
      });
      const upload = await youtube({
        version: "v3",
        auth,
      }).videos.insert({
        part: ["snippet", "status"],
        requestBody: {
          snippet: {
            title: path.basename(filePath),
            tags: ["kap"],
          },
          status: {
            privacyStatus: context.config.get("visibility") ?? "private",
          },
        },
        media: {
          body: fs.createReadStream(filePath),
        },
      });
      const videoId = upload.data.id;
      context.notify(`Video uploaded: https://youtu.be/${videoId}`, () => {
        open(`https://studio.youtube.com/video/${videoId}/edit`);
      });
    },
  },
];
