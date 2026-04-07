export function applyPricingLists(
    products: any[],
    client: any,
    pricingLists: any[]
  ) {
    if (!client || !pricingLists?.length) {
      return products.map(p => ({
        ...p,
        effectiveUnitPrice: p.basePrice,
      }));
    }
  
    const clientId = client._id.toString();
    const clientChainId = client.chain
      ? typeof client.chain === "object"
        ? client.chain._id.toString()
        : client.chain.toString()
      : null;
  
    return products.map((p) => {
      let effectivePrice = p.basePrice;
  
      for (const pl of pricingLists) {
        const clientMatch = pl.clientsAssigned.some(
          (c: any) => c._id.toString() === clientId
        );
  
        const chainMatch =
          clientChainId &&
          pl.chainsAssigned.some(
            (ch: any) => ch._id.toString() === clientChainId
          );
  
        if (!clientMatch && !chainMatch) continue;
  
        const productMatch = pl.productIds.some(
          (prod: any) => prod._id.toString() === p.productId.toString()
        );
  
        const brandMatch = pl.brandIds.some(
          (brand: any) => brand._id.toString() === p.brandId?.toString()
        );
  
        if (productMatch || brandMatch) {
          effectivePrice = pl.pricing;
          break; // first match wins
        }
      }
  
      return {
        ...p,
        effectiveUnitPrice: effectivePrice,
      };
    });
  }
  