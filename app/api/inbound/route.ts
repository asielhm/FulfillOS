import {
  type NextRequest,
} from "next/server";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InboundItem = {
  product_id: string;
  expected_quantity: number;
};

function redirectResponse(
  path: string,
) {
  return new Response(null, {
    status: 303,
    headers: {
      Location: path,
      "Cache-Control": "no-store",
    },
  });
}

function errorResponse(
  message: string,
) {
  return redirectResponse(
    `/inbound/new?error=${encodeURIComponent(
      message,
    )}`,
  );
}

function optionalText(
  formData: FormData,
  field: string,
) {
  const value = String(
    formData.get(field) ?? "",
  ).trim();

  return value || null;
}

export async function POST(
  request: NextRequest,
) {
  const supabase =
    await createClient();

  const {
    data: authData,
    error: authError,
  } =
    await supabase.auth.getClaims();

  const userId =
    authData?.claims?.sub;

  if (authError || !userId) {
    return redirectResponse(
      "/auth/login",
    );
  }

  const {
    data: membership,
    error: membershipError,
  } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq(
      "user_id",
      String(userId),
    )
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    return errorResponse(
      membershipError.message,
    );
  }

  if (!membership) {
    return redirectResponse(
      "/onboarding",
    );
  }

  if (
    ![
      "owner",
      "admin",
      "manager",
    ].includes(membership.role)
  ) {
    return redirectResponse(
      "/inbound?error=You do not have permission to create inbound shipments.",
    );
  }

  const formData =
    await request.formData();

  const customerId = String(
    formData.get("customerId") ?? "",
  ).trim();

  const warehouseId = String(
    formData.get("warehouseId") ??
      "",
  ).trim();

  if (!customerId) {
    return errorResponse(
      "Please select a customer.",
    );
  }

  if (!warehouseId) {
    return errorResponse(
      "Please select a warehouse.",
    );
  }

  const rawItems = String(
    formData.get("items") ?? "[]",
  );

  let parsedItems: unknown;

  try {
    parsedItems =
      JSON.parse(rawItems);
  } catch {
    return errorResponse(
      "The product list could not be read.",
    );
  }

  if (!Array.isArray(parsedItems)) {
    return errorResponse(
      "Add at least one product.",
    );
  }

  const items: InboundItem[] = [];

  for (const item of parsedItems) {
    if (
      typeof item !== "object" ||
      item === null
    ) {
      return errorResponse(
        "One of the product lines is invalid.",
      );
    }

    const record = item as {
      product_id?: unknown;
      expected_quantity?: unknown;
    };

    if (
      typeof record.product_id !==
        "string" ||
      !record.product_id
    ) {
      return errorResponse(
        "Select a product on every line.",
      );
    }

    const quantity = Number(
      record.expected_quantity,
    );

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      return errorResponse(
        "Expected quantities must be positive whole numbers.",
      );
    }

    items.push({
      product_id:
        record.product_id,
      expected_quantity:
        quantity,
    });
  }

  if (items.length === 0) {
    return errorResponse(
      "Add at least one product.",
    );
  }

  const expectedDate = String(
    formData.get("expectedDate") ??
      "",
  ).trim();

  let expectedAt:
    | string
    | null = null;

  if (expectedDate) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        expectedDate,
      )
    ) {
      return errorResponse(
        "Expected arrival date is invalid.",
      );
    }

    expectedAt =
      `${expectedDate}T12:00:00.000Z`;
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "create_inbound_shipment",
    {
      p_customer_id:
        customerId,

      p_warehouse_id:
        warehouseId,

      p_items:
        items,

      p_expected_at:
        expectedAt,

      p_customer_reference:
        optionalText(
          formData,
          "customerReference",
        ),

      p_carrier:
        optionalText(
          formData,
          "carrier",
        ),

      p_tracking_number:
        optionalText(
          formData,
          "trackingNumber",
        ),

      p_notes:
        optionalText(
          formData,
          "notes",
        ),
    },
  );

  if (error) {
    return errorResponse(
      error.message,
    );
  }

  const result = data as
    | {
        shipment_id?: unknown;
        inbound_number?: unknown;
      }
    | null;

  if (
    !result ||
    typeof result.shipment_id !==
      "string"
  ) {
    return errorResponse(
      "The inbound shipment was created but its ID could not be returned.",
    );
  }

  return redirectResponse(
    `/inbound/${result.shipment_id}?created=1`,
  );
}