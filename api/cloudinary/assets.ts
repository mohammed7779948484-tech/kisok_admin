import type { IncomingMessage, ServerResponse } from "node:http";
import { createCloudinaryAssetsHandler } from "../../server/cloudinary-assets-handler";

const handleCloudinaryAssets = createCloudinaryAssetsHandler(process.env);

export default async function cloudinaryAssets(
  request: IncomingMessage,
  response: ServerResponse,
) {
  const protocol = request.headers["x-forwarded-proto"] ?? "https";
  const host = request.headers.host ?? "localhost";
  const url = new URL(request.url ?? "/api/cloudinary/assets", `${protocol}://${host}`);
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
    else if (value !== undefined) headers.set(name, value);
  }

  const result = await handleCloudinaryAssets(
    new Request(url, { method: request.method, headers }),
  );
  result.headers.forEach((value, name) => response.setHeader(name, value));
  response.statusCode = result.status;
  response.end(Buffer.from(await result.arrayBuffer()));
}
