export function validateQuantity(
    value: unknown,
    fieldName: string,
    options: {
      allowZero?: boolean;
    } = {}
  ): number {
    const { allowZero = true } = options;
  
    if (
      value === null ||
      value === undefined ||
      value === "" ||
      typeof value === "boolean"
    ) {
      throw new Error(`${fieldName} is required`);
    }
  
    if (
      typeof value !== "number" &&
      typeof value !== "string"
    ) {
      throw new Error(`${fieldName} must be a number`);
    }
  
    const quantity = Number(value);
  
    if (!Number.isSafeInteger(quantity)) {
      throw new Error(
        `${fieldName} must be a whole number`
      );
    }
  
    if (quantity < 0 || (!allowZero && quantity === 0)) {
      throw new Error(
        `${fieldName} must be ${
          allowZero ? "zero or greater" : "greater than zero"
        }`
      );
    }
  
    return quantity;
  }