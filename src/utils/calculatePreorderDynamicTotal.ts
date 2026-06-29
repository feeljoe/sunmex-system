export const calculateDynamicTotal = (preorder: any) => {
    if (!preorder) return 0;
    if(preorder.status === "pending" || preorder.status === "assigned"){
      return preorder.subtotal || 0;
    }
    if(preorder.status === "ready"){
      if(!preorder.products || !Array.isArray(preorder.products)) return 0;
      return preorder.products.reduce((sum: number, item: any) => {
        const cost = item.actualCost || 0;
        const qty = item.pickedQuantity || 0;
  
        return sum + (cost * qty);
      }, 0);
    }

    return preorder.total || preorder.subtotal || 0;
  };

  export const calculateDynamicTotalUnits = (preorder: any) => {
    if (!preorder) return 0;
    if(preorder.status === "pending" || preorder.status === "assigned" || preorder.status === "cancelled"){
        if(!preorder.products || !Array.isArray(preorder.products)) return 0;
        return preorder.products.reduce((sum: number, item: any) => {
          const qty = item.quantity || 0;
    
          return sum + qty;
        }, 0);
    }
    if(preorder.status === "ready"){
        if(!preorder.products || !Array.isArray(preorder.products)) return 0;
        return preorder.products.reduce((sum: number, item: any) => {
          const qty = item.pickedQuantity || 0;
    
          return sum + qty;
        }, 0);
    }
    if(preorder.status === "delivered"){
        if(!preorder.products || !Array.isArray(preorder.products)) return 0;
        return preorder.products.reduce((sum: number, item: any) => {
          const qty = item.deliveredQuantity || 0;
    
          return sum + qty;
        }, 0);
    }

    return 0;
  };

  export const calculateDynamicTotalUnitsDirectSale = (directSale: any) => {
    if (!directSale) return 0;
    if(!directSale.products || !Array.isArray(directSale.products)) return 0;
    return directSale.products.reduce((sum: number, item: any) => {
        const qty = item.quantity || 0;

        return sum + qty;
    }, 0);
  };

  export const calculateDynamicTotalUnitsCreditMemo = (creditMemo: any) => {
    if (!creditMemo) return 0;
    if(!creditMemo.products || !Array.isArray(creditMemo.products)) return 0;
    if(creditMemo.status === "pending" || creditMemo.status === "cancelled")
    return creditMemo.products.reduce((sum: number, item: any) => {
        const qty = item.quantity || 0;

        return sum + qty;
    }, 0);
    if(creditMemo.status === "received")
        return creditMemo.products.reduce((sum: number, item: any) => {
            const qty = item.pickedQuantity || 0;
    
            return sum + qty;
        }, 0);
  };