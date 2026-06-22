import mongoose from "mongoose";
import xlsx from "xlsx";
import Route from "@/models/Route";
import Product from "@/models/Product";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function updateRoutesFromExcel(excelFilePath: string) {
  try {
    const rawUri = process.env.MONGODB_URI;
    const match = rawUri?.match(/(mongodb(?:\+srv)?:\/\/.+)/);
    const mongoUri = match ? match[0] : null;

    // 2. Print the exact string with brackets so we can see hidden characters
    console.log("EXACT URI SEEN BY SCRIPT:", `[${mongoUri}]`);
    if(!mongoUri){
        throw new Error("MONGODB_URI is not defined in your environment variables");
    }
    console.log("Connecting to database...");
    await mongoose.connect(mongoUri);
    console.log("Database connected successfully");

    // 2. Read the Excel File
    const workbook = xlsx.readFile(excelFilePath);
    const sheetName = workbook.SheetNames[0];
    const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const upcQuantityMap = new Map<string, number>();

    // Extract all UPCs from the Excel rows (assuming the column is named "UPC")
    const upcList = rawData
      .map((row: any) => {
        const upc = row["UPC"] ? String(row["UPC"]).trim() : null;
      
      const rawQty = row["Quantity"] ?? row["quantity"];
      const qty = Number(rawQty) || 0;
      
      if (upc && qty > 0) {
        upcQuantityMap.set(upc, qty);
        return upc;
      }
      return null;
    })
      .filter((upc) => upc !== null) as string[];

    if (upcList.length === 0) {
      console.log("No valid UPCs with a quantity > 0 found in the Excel file. Please check the column data.");
      return;
    }

    // 3. Find matching Products in the database
    // Using $in fetches all matching products in a single, efficient query
    const products = await Product.find({ upc: { $in: upcList } });
    
    if (products.length === 0) {
      console.log("None of the UPCs from the Excel file matched any products in the database.");
      return;
    }
    
    console.log(`Found ${products.length} products matching the provided UPCs.`);

    // 4. Fetch the target Routes (301 and 302)
    const targetRouteCodes = ["301"];
    const routes = await Route.find({ code: { $in: targetRouteCodes } });

    if (routes.length === 0) {
      console.log("Route 301 was not found in the database.");
      return;
    }

    // 5. Update each route's inventory
    for (const route of routes) {
      let addedCount = 0;

      for (const product of products) {
        // Check if the product is already in this route's inventory to prevent duplicates
        const excelQty = upcQuantityMap.get(product.upc) || 0;

        const existingItemIndex = route.inventory.findIndex(
          (item: any) => item.product.toString() === product._id.toString()
        );

        if (existingItemIndex === -1) {
          // Product is not in inventory, so we push it with the excel quantity
          route.inventory.push({
            product: product._id,
            quantity: excelQty,
          });
          addedCount++;
        } else {
          // Optional: If you wanted to ADD 30 to existing inventory instead of skipping, 
          // you would uncomment the line below:
          // route.inventory[existingItemIndex].quantity += 30;
        }
      }

      // Save the updated route document
      await route.save();
      console.log(`Successfully added ${addedCount} new products to Route ${route.code}.`);
    }

  } catch (error) {
    console.error("Error updating routes:", error);
  } finally {
    // 6. Disconnect
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

// Execute the function
updateRoutesFromExcel("/Users/joelvalenzuela/Desktop/products.xlsx");