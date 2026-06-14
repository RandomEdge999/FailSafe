import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const apiBaseUrl = process.env.ORCHESTRATOR_API_BASE_URL?.replace(/\/$/, "");

function targetUrl(path: string[], request: NextRequest) {
  if (!apiBaseUrl) {
    throw new Error("ORCHESTRATOR_API_BASE_URL is not configured.");
  }

  const url = new URL(request.url);
  const target = new URL(`${apiBaseUrl}/${path.join("/")}`);
  target.search = url.search;
  return target;
}

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;

  try {
    const method = request.method.toUpperCase();
    const body =
      method === "GET" || method === "HEAD" ? undefined : await request.text();
    const response = await fetch(targetUrl(path, request), {
      body,
      cache: "no-store",
      headers: {
        "content-type": request.headers.get("content-type") ?? "application/json"
      },
      method
    });
    const payload = await response.text();

    return new NextResponse(payload, {
      headers: {
        "content-type":
          response.headers.get("content-type") ?? "application/json; charset=utf-8"
      },
      status: response.status
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "api_proxy_unavailable",
        message:
          error instanceof Error
            ? error.message
            : "FailSafe API proxy is unavailable."
      },
      { status: 502 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
