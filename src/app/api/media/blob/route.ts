import { get } from "@vercel/blob";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.searchParams.get("pathname");

  if (!pathname) {
    return NextResponse.json({ error: "Missing pathname" }, { status: 400 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const getOptions = {
    ifNoneMatch: request.headers.get("if-none-match") ?? undefined,
    ...(token ? { token } : {}),
  };

  let result = await get(pathname, { access: "private", ...getOptions });
  if (!result || (result.statusCode !== 200 && result.statusCode !== 304)) {
    result = await get(pathname, { access: "public", ...getOptions });
  }

  if (!result) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (result.statusCode === 304) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: result.blob.etag,
        "Cache-Control": "private, no-cache",
      },
    });
  }

  if (result.statusCode !== 200 || !result.stream) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType,
      "X-Content-Type-Options": "nosniff",
      "Accept-Ranges": "bytes",
      ETag: result.blob.etag,
      "Cache-Control": "private, no-cache",
    },
  });
}