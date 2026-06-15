import { NextResponse } from "next/server";
import { parseFacebookSignedRequest } from "@/lib/facebook-signed-request";
import { processFacebookDataDeletion } from "@/lib/facebook-data-deletion";

export async function POST(request: Request) {
  const appSecret = process.env.FACEBOOK_CLIENT_SECRET;
  if (!appSecret) {
    return NextResponse.json(
      { error: "Facebook app secret not configured" },
      { status: 503 },
    );
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";
    let signedRequest: string | null = null;

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = await request.formData();
      signedRequest = form.get("signed_request")?.toString() ?? null;
    } else if (contentType.includes("application/json")) {
      const body = await request.json();
      signedRequest = body.signed_request ?? null;
    } else {
      const text = await request.text();
      const params = new URLSearchParams(text);
      signedRequest = params.get("signed_request");
    }

    if (!signedRequest) {
      return NextResponse.json(
        { error: "signed_request is required" },
        { status: 400 },
      );
    }

    const payload = parseFacebookSignedRequest(signedRequest, appSecret);
    if (!payload?.user_id) {
      return NextResponse.json(
        { error: "Invalid signed_request" },
        { status: 400 },
      );
    }

    const { confirmationCode, statusUrl } =
      await processFacebookDataDeletion(payload.user_id);

    return NextResponse.json({
      url: statusUrl,
      confirmation_code: confirmationCode,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Data deletion failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}