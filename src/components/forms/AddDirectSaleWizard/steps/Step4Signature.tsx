import SignaturePad from "@/components/ui/SignaturePad";

export default function StepSignature({ onSave, signature }: any) {
  return (
    <div className="flex flex-col h-full items-center space-y-6">
      <h2 className="text-xl font-bold text-center">Customer Signature</h2>
      <p className="text-sm text-gray-500">Please have the customer sign in the box below to authorize the sale.</p>
      
      <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden w-full max-w-md">
        <SignaturePad onSave={onSave} />
      </div>

      {signature && (
        <div className="p-2 bg-green-100 text-green-700 rounded-lg text-sm font-bold">
          ✓ Signature Captured
        </div>
      )}
    </div>
  );
}