import { put } from "@vercel/blob";

/**
 * Capture and upload a board snapshot to Vercel Blob storage
 * @param conversationId - The conversation ID
 * @param utils - tRPC utils for fetching board data
 * @param getUploadUrl - Mutation function to get upload URL
 * @returns The blob URL of the uploaded snapshot, or null if failed
 */
export async function captureBoardSnapshot(
  conversationId: string,
  utils: any,
  getUploadUrl: any,
): Promise<string | null> {
  try {
    const boardData = await utils.board.get.fetch({ conversationId });
    if (!boardData?.scene) {
      return null;
    }

    const sceneJson = JSON.stringify(boardData.scene);
    const blob = new Blob([sceneJson], { type: "application/json" });

    const uploadInfo = await getUploadUrl.mutateAsync({
      filename: `board-snapshot-${conversationId}-${Date.now()}.png`,
      contentType: "image/png",
    });

    const uploadedBlob = await put(
      uploadInfo.pathname.replace(/\.png$/, ".json"),
      blob,
      {
        access: "public",
        token: uploadInfo.token,
        contentType: "application/json",
      },
    );

    return uploadedBlob.url;
  } catch (error) {
    console.warn("Failed to capture board snapshot:", error);
    return null;
  }
}

