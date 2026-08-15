export default {
  async fetch(request: Request): Promise<Response> {
    try {
      const { createCloudinaryAssetsHandler } = await import(
        "../../server/cloudinary-assets-handler.js"
      );
      return await createCloudinaryAssetsHandler(process.env)(request);
    } catch (error) {
      console.error("Cloudinary media function failed to initialize:", error);
      return Response.json(
        { error: "Cloudinary media service is temporarily unavailable." },
        {
          status: 503,
          headers: {
            "Cache-Control": "private, no-store",
            Vary: "Authorization",
          },
        },
      );
    }
  },
};
