import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import CommissionSettings from "@/models/CommissionSettings";

export async function GET() {
    try {
      await connectToDatabase();
      
      // Find the singleton document
      const settings = await CommissionSettings.findOne({ isSingleton: true }).lean();
  
      // If it DOES NOT exist yet, return a safe 200 response with default values
      if (!settings) {
        return NextResponse.json({
          defaultPercentage: 1.5,
          rules: [],
        }, { status: 200 });
      }
  
      return NextResponse.json(settings, { status: 200 });
    } catch (error: any) {
      console.error("Failed to fetch commission settings:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
  
  export async function PUT(req: Request) {
    try {
      await connectToDatabase();
      const body = await req.json();
      
      // Extract the values sent from your frontend
      const { defaultPercentage, rules, user } = body;
  
      // Upsert: Update if found, Create if not found.
      const updatedSettings = await CommissionSettings.findOneAndUpdate(
        { isSingleton: true }, // The query to find the document
        { 
          $set: {
            defaultPercentage: Number(defaultPercentage),
            rules: rules,
            updatedBy: user // Store the ID of the admin making the change
          }
        },
        { 
          new: true, // Return the updated document
          upsert: true, // CREATE IT if it doesn't exist!
          setDefaultsOnInsert: true 
        }
      );
  
      return NextResponse.json(updatedSettings, { status: 200 });
    } catch (error: any) {
      console.error("Failed to save commission settings:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }