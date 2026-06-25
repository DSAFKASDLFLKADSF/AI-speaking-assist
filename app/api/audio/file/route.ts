import { readFile, stat } from "fs/promises";
import { NextResponse } from "next/server";
import { resolveAudioFilePath } from "@/lib/audioStorage";

export const runtime = "nodejs";

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  webm: "audio/webm",
  wav: "audio/wav",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  ogg: "audio/ogg",
};

function contentTypeForPath(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPE_BY_EXT[ext] ?? "application/octet-stream";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storagePath = searchParams.get("path");

  if (!storagePath) {
    return NextResponse.json({ error: "Missing path." }, { status: 400 });
  }

  const fullPath = resolveAudioFilePath(storagePath);
  if (!fullPath) {
    return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  }

  try {
    const fileStat = await stat(fullPath);
    if (!fileStat.isFile()) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const data = await readFile(fullPath);
    const contentType = contentTypeForPath(fullPath);

    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(data.byteLength),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}
