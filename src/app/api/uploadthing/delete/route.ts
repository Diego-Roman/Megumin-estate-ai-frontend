import { UTApi } from "uploadthing/server";
import { NextRequest, NextResponse } from "next/server";

const utapi = new UTApi();

export async function DELETE(req: NextRequest) {
  try {
    const { fileUrl } = await req.json() as { fileUrl: string };
    if (!fileUrl) {
      return NextResponse.json({ error: "fileUrl is required" }, { status: 400 });
    }

    // Extract the fileKey from the URL (last path segment)
    const fileKey = fileUrl.split("/").at(-1);
    if (!fileKey) {
      return NextResponse.json({ error: "Could not extract fileKey from URL" }, { status: 400 });
    }

    await utapi.deleteFiles(fileKey);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[UT delete]", err);
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  }
}
