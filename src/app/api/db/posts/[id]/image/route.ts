import { NextResponse } from "next/server";
import { uploadToBlob } from "@/lib/blob-storage";
import { prisma } from "@/lib/db";
import { postToSaved } from "@/lib/db-mappers";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import type { ImageOverlayLayer, PostMedia } from "@/lib/types";

async function getOwnedPost(id: string, userId: string) {
  return prisma.post.findFirst({ where: { id, userId } });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;

  try {
    const { id } = await params;
    const existing = await getOwnedPost(id, userId);
    if (!existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const imageFile = formData.get("image");
    const overlaysRaw = formData.get("overlays");

    if (!(imageFile instanceof Blob)) {
      return NextResponse.json({ error: "Image file required" }, { status: 400 });
    }

    let overlays: ImageOverlayLayer[] = [];
    if (typeof overlaysRaw === "string") {
      try {
        overlays = JSON.parse(overlaysRaw) as ImageOverlayLayer[];
      } catch {
        return NextResponse.json({ error: "Invalid overlays JSON" }, { status: 400 });
      }
    }

    const currentImage = existing.image as PostMedia;
    const baseUrl =
      currentImage.originalBaseUrl ?? currentImage.originalUrl ?? currentImage.url;

    let editedUrl: string;
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

    if (blobToken) {
      const filename = `posts/${userId}/${id}-${Date.now()}.png`;
      editedUrl = await uploadToBlob(filename, imageFile, "image/png");
    } else if (imageFile.size < 2_000_000) {
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      editedUrl = `data:image/png;base64,${buffer.toString("base64")}`;
    } else {
      return NextResponse.json(
        {
          error:
            "Image too large for inline storage. Set BLOB_READ_WRITE_TOKEN for cloud uploads.",
        },
        { status: 413 },
      );
    }

    const updatedImage: PostMedia = {
      ...currentImage,
      url: editedUrl,
      editedUrl,
      originalBaseUrl: baseUrl,
      overlays,
      source: "edited",
    };

    const updated = await prisma.post.update({
      where: { id },
      data: { image: updatedImage },
    });

    return NextResponse.json({ post: postToSaved(updated) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}