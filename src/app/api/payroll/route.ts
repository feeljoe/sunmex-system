import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
import PreOrder from "@/models/PreOrder";
import DirectSale from "@/models/DirectSale";
import CommissionSettings from "@/models/CommissionSettings";
import PayrollAdjustment from "@/models/PayrollAdjustment";

// Helper to count only Monday - Friday
function getBusinessDays(startDate: Date, endDate: Date) {
  let count = 0;
  let curDate = new Date(startDate.getTime());
  
  while (curDate <= endDate) {
    const dayOfWeek = curDate.getUTCDay(); // 0 is Sunday, 6 is Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    curDate.setUTCDate(curDate.getUTCDate() + 1);
  }
  return count;
}

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json({ error: "Missing date range" }, { status: 400 });
    }

    const startDate = new Date(from + "T00:00:00.000Z");
    const endDate = new Date(to + "T23:59:59.999Z");

    // --- NEW: Calculate Business Days Only ---
    const businessDaysInPeriod = getBusinessDays(startDate, endDate);

    // 1. Fetch Global Settings & Users
    const settings = await CommissionSettings.findOne({ isSingleton: true }).lean();
    const defaultRate = settings?.defaultPercentage || 1.5;
    const rules = settings?.rules || [];
    const users = await User.find({}).lean(); 

    // --- NEW: Fetch all pending adjustments for this period ---
    const adjustments = await PayrollAdjustment.find({
      processed: false
    }).lean();

    const payrollResults = [];

    // 2. Loop through users and calculate
    for (const user of users) {
      // Multiply daily rate by BUSINESS days only
      let baseSalary = (user.salary || 0) * businessDaysInPeriod; 
      let commission = 0;
      let bonuses = 0;
      let deductions = 0;

      // Calculate Adjustments for this specific user
      const userAdjustments = adjustments.filter((adj: any) => adj.user.toString() === user._id.toString());
      
      // NEW: Pass the full details to the frontend
      const adjustmentDetails: any[] = []; 

      userAdjustments.forEach((adj: any) => {
        if (adj.type === "bonus") bonuses += adj.amount;
        if (adj.type === "deduction") deductions += adj.amount;
        
        // Push the details so the table can display the reason
        adjustmentDetails.push({
          type: adj.type,
          amount: adj.amount,
          reason: adj.reason
        });
      });

      // If they are a vendor, run the Commission Engine
      if (user.userRole === "vendor") {
        const match = { 
          createdBy: user._id, 
          deliveredAt: { $gte: startDate, $lte: endDate },
          status: "delivered" 
        };

        const [preorders, directSales] = await Promise.all([
          PreOrder.find(match)
            .populate({ 
              path: "products.productInventory", 
              populate: { path: "product", populate: [{ path: "brand" }, { path: "productType" }] } 
            }).lean(),
          DirectSale.find(match)
            .populate({ 
              path: "products.product", 
              populate: [{ path: "brand" }, { path: "productType" }] 
            }).lean()
        ]);

        const calculateLineItem = (price: number, qty: number, brandId: string, typeId: string) => {
          if (qty <= 0 || price <= 0) return 0;
          let appliedRate = defaultRate;

          let activeRule = rules.find((r: any) => r.ruleType === "brand" && r.targetId.toString() === brandId?.toString());
          if (!activeRule) {
            activeRule = rules.find((r: any) => r.ruleType === "category" && r.targetId.toString() === typeId?.toString());
          }

          if (activeRule) {
            const tier = activeRule.tiers.find((t: any) => {
              const matchesMin = price >= t.minPrice;
              const matchesMax = t.maxPrice === null || price <= t.maxPrice;
              return matchesMin && matchesMax;
            });
            if (tier) appliedRate = tier.percentage;
          }

          return (price * qty) * (appliedRate / 100);
        };

        preorders.forEach((po: any) => {
          po.products.forEach((p: any) => {
            const product = p.productInventory?.product;
            if (!product) return;
            const price = p.actualCost || 0;
            const qty = p.deliveredQuantity || p.pickedQuantity || 0;
            commission += calculateLineItem(price, qty, product.brand?._id, product.productType?._id);
          });
        });

        directSales.forEach((ds: any) => {
          ds.products.forEach((p: any) => {
            const product = p.product;
            if (!product) return;
            const price = p.unitPrice || 0;
            const qty = p.quantity || 0;
            commission += calculateLineItem(price, qty, product.brand?._id, product.productType?._id);
          });
        });
      }

      payrollResults.push({
        id: user._id.toString(),
        firstName: user.firstName || "Unknown", // Added a fallback just in case!
        lastName: user.lastName || "",
        role: user.userRole,
        baseSalary,
        commission,
        bonuses,       
        deductions,    
        adjustmentDetails, // <-- Added this right here!
        status: "pending" 
      });
    }

    payrollResults.sort((a, b) => {
      if (a.role === "admin" && b.role !== "admin") return -1;
      if (a.role !== "admin" && b.role === "admin") return 1;
      if (a.role === "vendor" && b.role !== "vendor") return -1;
      if (a.role !== "vendor" && b.role === "vendor") return 1;
      if (a.role === "warehouse" && b.role !== "warehouse") return -1;
      if (a.role !== "warehouse" && b.role === "warehouse") return 1;
      if (a.role === "driver" && b.role !== "driver") return -1;
      if (a.role !== "driver" && b.role === "driver") return 1;
      
      return a.firstName.localeCompare(b.firstName);
    });

    return NextResponse.json({ items: payrollResults });

  } catch (error: any) {
    console.error("Payroll Generation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}