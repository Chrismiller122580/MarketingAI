import { NextResponse } from "next/server";
import { parseFacebookSignedRequest } from "@/lib/facebook-signed-request";
import { processFacebookDataDeletion } from "@/lib/facebook-data-deletion";
import { getAppOrigin } from "@/lib/app-url";

export async function GET() {
  const configured = !!process.env.FACEBOOK_CLIENT_SECRET;
  return NextResponse.json({
    status: "ok",
    endpoint: "facebook-data-deletion-callback",
    method: "POST",
    configured,
    callback_url: `${getAppOrigin()}/api/facebook/data-deletion`,
    message: configured
      ? "Ready to receive Meta data deletion requests via POST signed_request."
      : "FACEBOOK_CLIENT_SECRET is not set — add it in Vercel env vars and redeploy.",
  });
}

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