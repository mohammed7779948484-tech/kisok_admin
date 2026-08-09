import { createCloudinaryAssetsHandler } from "../../server/cloudinary-assets-handler";

const handleCloudinaryAssets = createCloudinaryAssetsHandler(process.env);

export default {
  fetch(request: Request) {
    return handleCloudinaryAssets(request);
  },
};
