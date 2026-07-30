import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import PayrollAdjustment from "@/models/PayrollAdjustment"; // Adjust this import to match your actual model name

// ----------------------------------------------------------------------
// EDIT (PATCH) an existing adjustment
// ----------------------------------------------------------------------
export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }>}
) {
    try {
        await connectToDatabase();
        
        // Note: Depending on your Next.js version, you may need to await params
        const { id } = await context.params;
        const body = await req.json();

        // Ensure the ID is valid
        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

        // Ensure the edit reason was provided (Safety check backing up the frontend)
        if (!body.editReason || body.editReason.trim() === "") {
            return NextResponse.json({ error: "An edit reason is required." }, { status: 400 });
        }

        // Find the existing record to ensure it exists
        const existingAdjustment = await PayrollAdjustment.findById(id);
        if (!existingAdjustment) {
            return NextResponse.json({ error: "Adjustment not found." }, { status: 404 });
        }

        // Update the document. We push the edit details into an array 
        // to keep a strict audit trail for payroll!
        const updatedAdjustment = await PayrollAdjustment.findByIdAndUpdate(
            id,
            {
                $set: {
                    userId: body.userId,
                    type: body.type,
                    amount: Number(body.amount),
                    reason: body.reason,
                },
                $push: {
                    editHistory: {
                        editedAt: new Date(),
                        editedBy: body.adminId,
                        reason: body.editReason,
                        previousAmount: existingAdjustment.amount
                    }
                }
            },
            { new: true } // Returns the updated document
        );

        return NextResponse.json(updatedAdjustment, { status: 200 });

    } catch (error: any) {
        console.error("Error updating adjustment:", error);
        return NextResponse.json({ error: "Failed to update adjustment." }, { status: 500 });
    }
}

// ----------------------------------------------------------------------
// DELETE an existing adjustment
// ----------------------------------------------------------------------
export async function DELETE(
    req: NextRequest,
    context: { params: { id: string } }
) {
    try {
        await connectToDatabase();
        
        const { id } = await context.params;

        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

        const deletedAdjustment = await PayrollAdjustment.findByIdAndDelete(id);

        if (!deletedAdjustment) {
            return NextResponse.json({ error: "Adjustment not found." }, { status: 404 });
        }

        return NextResponse.json({ message: "Adjustment successfully deleted." }, { status: 200 });

    } catch (error: any) {
        console.error("Error deleting adjustment:", error);
        return NextResponse.json({ error: "Failed to delete adjustment." }, { status: 500 });
    }
}