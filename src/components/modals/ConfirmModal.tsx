import React, { ReactElement, JSXElementConstructor, ReactNode, ReactPortal, Key } from "react";

type ConfirmField = {
  label: string;
  key: string;
  format?: (value: any, data?: any) => React.ReactNode;
};

type ConfirmSection = {
  title: string;
  fields: ConfirmField[];
};

type ConfirmModalProps ={
  open: boolean,
  title: string,
  sections: ConfirmSection[],
  data: any,
  onConfirm: () => void;
  onBack: () => void;
};

// ConfirmModal.tsx
export function ConfirmModal({
  open,
  title,
  sections,
  data,
  onConfirm,
  onBack,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex flex-col justify-center items-center">
      {/* Sticky Header */}
      <div className="flex sticky bg-(--secondary) items-center justify-center shadow-xl font-semibold text-xl text-center w-110 h-20 rounded-xl">
          {title}
        </div>
      <div className="bg-white w-full max-w-2xl max-h-[80vh] rounded-xl flex flex-col items-center shadow-xl">

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-10 space-y-6 w-full">
          {sections.map((section: { title: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; fields: any[]; }, i: Key | null | undefined) => (
            <div key={i}>
              <h3 className="font-semibold text-lg mb-3">
                {section.title}
              </h3>

              <div className="space-y-2">
                {section.fields.map((field, j) => {
                  const rawValue = data[field.key];
                  const value = field.format
                    ? field.format(rawValue, data)
                    : rawValue ?? "—";

                  return (
                    <div
                      key={j}
                      className="flex justify-between text-sm border-b py-1"
                    >
                      <span className="text-gray-500">
                        {field.label}
                      </span>
                      <span className="font-medium text-gray-800">
                        {value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sticky Footer */}
        <div className="sticky bg-white p-5 flex justify-end gap-3">
          <button
            onClick={onBack}
            className="px-4 py-2 rounded bg-gray-200"
          >
            Go Back
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded bg-blue-500 text-white"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
  