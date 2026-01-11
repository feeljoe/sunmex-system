export default function StepReceiptInfo({ form, setForm, onNext, onBack }: any) {
    return (
      <>
        <h2 className="text-xl lg:text-2xl text-center font-semibold mb-4">Receipt Info</h2>
        <div className="">
          <span className="font-bold">Invoice Number</span>
          <input
            placeholder="Invoice Number"
            value={form.invoice || ""}
            onChange={e => setForm({ ...form, invoice: e.target.value })}
            className="bg-white text-center w-full h-10 rounded-xl mt-5"
          />
        </div>
      </>
    );
  }
  