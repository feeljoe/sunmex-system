import { connectToDatabase } from "./db";
import CompanySettings from "@/models/CompanySettings";

export async function getCompanySettings() {
    await connectToDatabase();
    return CompanySettings.findOne({key: "main"}).lean();
}