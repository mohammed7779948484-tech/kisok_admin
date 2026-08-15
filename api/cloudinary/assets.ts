import { createCloudinaryAssetsHandler } from "../../server/cloudinary-assets-handler";

const handleCloudinaryAssets = createCloudinaryAssetsHandler(process.env);

export default {
  fetch(request: Request): Promise<Response> {
    return handleCloudinaryAssets(request);
  },
};
