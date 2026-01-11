// components/forms/AddProductWizard/ProgressBar.tsx
export function ProgressBar({
  step,
  steps,
}: {
  step: number;
  steps: string[];
}) {
  return (
    <div className="w-full flex justify-center mb-8">
      <div className="flex items-center w-full max-w-4xl">
        {steps.map((label, index) => {
          const active = step >= index + 1;
          const completed = step > index + 1;

          return (
            <div key={label} className="flex items-center justify-center flex-1">
              {/* Step */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-semibold
                    transition-all duration-300
                    ${
                      active
                        ? "bg-blue-600 text-white"
                        : "bg-gray-300 text-gray-600"
                    }`}
                >
                  {index + 1}
                </div>

                <span className="mt-2 text-lg text-center">
                  {label}
                </span>
              </div>

              {/* Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 items-center justify-center mb-8">
                  <div
                    className={`h-2 w-full rounded transition-all duration-300
                      ${
                        completed
                          ? "bg-blue-600"
                          : "bg-gray-300"
                      }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
