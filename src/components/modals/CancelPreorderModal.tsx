"use client";

import { useState } from "react";
export default function CancelOrderModal({
    preorder,
    directSale,
    loadRequest,
    onClose,
    onConfirm,
}: {
    preorder?: any;
    directSale?: any;
    loadRequest?: any;
    onClose: () => void;
    onConfirm: (reason: string) => void;
}) {
    const [reason, setReason] = useState("");

    const getDestinationValue = (value:string) => {
      switch (value) {
        case "yuma":
          return "Yuma";
        case "tucson":
          return "Tucson";
        case "elPaso":
          return "El Paso";
        case "lasVegas":
          return "Las Vegas";
        default:
          return "";
      }
    };
    const getLoadRequestValue = (loadRequest: any) => {
      const destination = getDestinationValue(loadRequest.destinationLocation);
      const route = loadRequest.route;
      if(destination.trim() !== "") {
        return destination;
      }
      if(route){
        return `${route.code} | ${route.user?.firstName} ${route.user?.lastName}`;
      }
      return "N/A";
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white text-center rounded-xl shadow-xl max-w-[98vw] md:max-w-[30vw] w-full p-2 space-y-2">
          {preorder ? (
            <h2 className="text-2xl font-semibold text-red-600">
                Cancel Preorder #{preorder.number}
            </h2>
          ): directSale ? (
            <h2 className="text-2xl font-semibold text-red-600">
                Cancel Direct Sale #{directSale.number}
            </h2>
          ): loadRequest ? (
            <h2 className="text-2xl font-semibold text-red-600">
                Cancel Load Request #{loadRequest.LRNumber}
            </h2>
          ): (
            <h2></h2>
          )}
            <h3 className="text-xl font-semibold text-red-600 text-center">
                <strong>for {preorder ? preorder?.client?.clientName : directSale ? directSale?.client?.clientName : getLoadRequestValue(loadRequest)}</strong>?
            </h3>
            <textarea 
                className="w-full shadow-xl rounded-xl p-2 resize-none"
                rows={4}
                placeholder="Reason for Cancellation (required)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}>

            </textarea>
    
            <p className="text-sm text-gray-500 text-center">
              This action will restore all reserved inventory and cannot be undone.
            </p>
    
            <div className="flex justify-between">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-gray-300 hover:bg-gray-500 transition-all duration:500 cursor-pointer"
              >
                No, go back
              </button>
    
              <button
                disabled={!reason.trim()}
                onClick={() => onConfirm(reason)}
                className="disabled:opacity-0 bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-all duration:500 cursor-pointer"
              >
                Confirm cancel
              </button>
            </div>
          </div>
        </div>
      );
}