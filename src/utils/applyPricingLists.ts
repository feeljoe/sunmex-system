export function applyPricingLists(
    products: any[],
    client: any,
    pricingLists: any[]
  ) {
    if (!client || !pricingLists?.length) {
      return products.map(p => ({
        ...p,
        effectiveUnitPrice: p.unitPrice ?? p.basePrice ?? 0,
      }));
    }
  
    const clientId = client._id.toString() || client.toString();
    const clientChainId = client.chain
      ? typeof client.chain === "object"
        ? client.chain._id.toString()
        : client.chain.toString()
      : null;
  
    return products.map((p) => {
      let effectivePrice = p.unitPrice ?? p.basePrice ?? 0;
  
      for (const pl of pricingLists) {
        const clientMatch = pl.clientsAssigned.some(
          (c: any) => (c._id ? c._id.toString() : c.toString()) === clientId
        );
  
        const chainMatch =
          clientChainId &&
          pl.chainsAssigned.some(
            (ch: any) => (ch._id ? ch._id.toString() : ch.toString()) === clientChainId
          );
  
        if (!clientMatch && !chainMatch) continue;
  
        const productMatch = pl.productIds.some(
          (prod: any) => (prod._id ? prod._id.toString(): prod.toString()) === p.productId.toString()
        );
  
        const brandMatch = pl.brandIds.some(
          (brand: any) => (brand._id ? brand._id.toString() : brand.toString()) === p.brandId?.toString()
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
  