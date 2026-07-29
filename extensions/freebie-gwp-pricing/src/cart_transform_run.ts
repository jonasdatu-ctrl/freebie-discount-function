import type {
  CartTransformRunInput,
  CartTransformRunResult,
  Operation,
} from "../generated/api";

const NO_CHANGES: CartTransformRunResult = {
  operations: [],
};

const ROLE_MAIN = "main";
const ROLE_FREEBIE = "freebie";

export function cartTransformRun(input: CartTransformRunInput): CartTransformRunResult {
  const lines = input.cart.lines;

  const pairedTimestamps = new Set(
    lines
      .filter((line) => line.freebieGwpRole?.value === ROLE_MAIN)
      .map((line) => line.freebieGwp?.value)
      .filter((timestamp): timestamp is string => Boolean(timestamp)),
  );

  const operations: Operation[] = lines
    .filter((line) => {
      const timestamp = line.freebieGwp?.value;
      return (
        line.freebieGwpRole?.value === ROLE_FREEBIE &&
        Boolean(timestamp) &&
        pairedTimestamps.has(timestamp!)
      );
    })
    .map((line) => ({
      lineUpdate: {
        cartLineId: line.id,
        price: {
          adjustment: {
            fixedPricePerUnit: {
              amount: "0",
            },
          },
        },
      },
    }));

  if (operations.length === 0) {
    return NO_CHANGES;
  }

  return { operations };
}
