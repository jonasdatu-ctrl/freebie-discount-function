const FUNCTION_TITLE = "freebie-gwp-pricing";

// Idempotent: safe to call on every auth (install, re-install, scope update).
// Skips creation if a cart transform for this app already exists.
export async function registerFreebieCartTransform(admin) {
  const existingResponse = await admin.graphql(
    `#graphql
    query ExistingCartTransforms {
      cartTransforms(first: 1) {
        nodes {
          id
        }
      }
    }`,
  );
  const existingJson = await existingResponse.json();
  if (existingJson.data.cartTransforms.nodes.length > 0) {
    console.log("[freebie-gwp-pricing] Cart transform already registered, skipping.");
    return;
  }

  const functionsResponse = await admin.graphql(
    `#graphql
    query FreebieGwpFunction {
      shopifyFunctions(first: 25) {
        nodes {
          id
          apiType
          title
        }
      }
    }`,
  );
  const functionsJson = await functionsResponse.json();
  const targetFunction = functionsJson.data.shopifyFunctions.nodes.find(
    (fn) => fn.apiType === "cart_transform" && fn.title === FUNCTION_TITLE,
  );

  if (!targetFunction) {
    console.error(
      `[freebie-gwp-pricing] Could not find a deployed "${FUNCTION_TITLE}" cart_transform function to register. Run "shopify app deploy" first.`,
    );
    return;
  }

  const createResponse = await admin.graphql(
    `#graphql
    mutation CreateFreebieCartTransform($functionId: String!) {
      cartTransformCreate(functionId: $functionId, blockOnFailure: false) {
        cartTransform {
          id
        }
        userErrors {
          field
          message
        }
      }
    }`,
    { variables: { functionId: targetFunction.id } },
  );
  const createJson = await createResponse.json();
  const userErrors = createJson.data?.cartTransformCreate?.userErrors ?? [];
  if (userErrors.length > 0) {
    console.error("[freebie-gwp-pricing] cartTransformCreate failed:", userErrors);
    return;
  }
  console.log(
    "[freebie-gwp-pricing] Cart transform registered:",
    createJson.data?.cartTransformCreate?.cartTransform?.id,
  );
}
