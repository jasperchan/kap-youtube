import { authenticate } from "@google-cloud/local-auth";
import { Credentials, OAuth2Client } from "google-auth-library";
import fs from "fs";
import tmp from "tmp";

export async function authorize(options: {
  client: {
    installed: {
      client_id: string;
      project_id: string;
      auth_uri: string;
      token_uri: string;
      auth_provider_x509_cert_url: string;
      client_secret: string;
      redirect_uris: Array<string>;
    };
  };
  scopes: string[];
  save: (credentials: Credentials) => Promise<void>;
  load: () => Promise<Credentials>;
}) {
  const credentials = await options.load();
  if (credentials) {
    return new OAuth2Client({
      clientId: options.client.installed.client_id,
      clientSecret: options.client.installed.client_secret,
      credentials,
    });
  }
  const keyFilePath = tmp.fileSync({
    discardDescriptor: true,
    postfix: ".json",
  });
  try {
    fs.writeFileSync(keyFilePath.name, JSON.stringify(options.client));
    const client = await authenticate({
      scopes: options.scopes,
      keyfilePath: keyFilePath.name,
    });
    if (client.credentials) {
      await options.save(client.credentials);
    }
    return client;
  } finally {
    keyFilePath.removeCallback();
  }
}
