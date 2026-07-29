import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(
    `#graphql
    query ActiveCartTransforms {
      cartTransforms(first: 1) {
        nodes {
          id
        }
      }
    }`,
  );
  const { data } = await response.json();

  return { active: data.cartTransforms.nodes.length > 0 };
};

export default function Index() {
  const { active } = useLoaderData();

  return (
    <s-page heading="Freebie GWP pricing">
      <s-section heading="Status">
        <s-paragraph>
          {active
            ? "Active. Gift-with-purchase freebie lines paired with their qualifying main product are set to $0 at checkout."
            : "Not active yet. This registers automatically the next time the app is authenticated after being deployed."}
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
