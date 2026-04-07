import { formatNameListWithLimit } from "@/utils/formatters";

export const paymentTermConfirmConfig = [
  {
    title: "Payment Term Information",
    fields: [
      {label: "Name", key: "name"},
      {label: "Due Days", key:"dueDays"},
      {label: "Discount Days", key: "discountDays"},
      {label: "Discount Percentage", key:"discountPercentage"},
    ],
  }
];
export function productConfirmConfig({
  brandMap,
}: {
  brandMap: Record<string, string>;
}) { return [
    {
        title: "Basic Information",
        fields: [
            { label: "Name", key: "name" },
            { label: "SKU", key: "sku" },
            { label: "Vendor SKU", key: "vendorSku" },
            { label: "UPC", key: "upc" },
            { label: "Brand", key: "brand", format: (brandId: any) => brandMap[brandId] ?? "-" },
            { label: "Unit Cost", key: "unitCost", format: (value: {name: any;}) => `$${value}` },
            { label: "Unit Price", key: "unitPrice", format: (value: {name: any;}) => `$${value}` },
        ],
    },{
        title: "Packaging",
        fields: [
            { label: "Product Type", key: "productType" },
            { label: "Product Line", key: "productLine" },
            { label: "Product Family", key: "productFamily" },
            { label: "Case Size", key: "caseSize" },
            { label: "Layer Size", key: "layerSize" },
            { label: "Pallet Size", key: "palletSize" },
            { label: "Weight", key: "weight" },
            { label: "Units", key: "unit" },
        ]
    },
    {
        title: "Product Image",
        fields: [
            { label: "Image Preview", key: "imageUrl" },
        ]
    }
]}

export const userConfirmConfig = [
    {
        title: "Basic Info",
        fields: [
            { label: "First Name", key: "firstName" },
            { label: "Last Name", key: "lastName" },
            { label: "Role", key: "userRole" },
            { label: "Username", key: "username" },
        ],
    },
    {
        title: "Contact Info",
        fields: [
            { label: "Phone Number", key: "phoneNumber" },
            { label: "Email", key: "email" },
        ],
    },
];

export const pricingListConfirmConfig = [
    {
      title: "Pricing List Details",
      fields: [
        { label: "Name", key: "name" },
  
        {
          label: "Applies To",
          key: "appliesTo",
          format: (_: any, data: any) =>
            data.appliesTo === "product"
              ? formatNameListWithLimit(data.productIds)
              : formatNameListWithLimit(data.brandIds),
        },
  
        {
          label: "Assigned",
          key: "clientsAssigned",
          format: (_: any, data: any) =>
            data.appliesToClients === "client"
              ? formatNameListWithLimit(data.clientsAssigned, {
                  key: "clientName",
                })
              : formatNameListWithLimit(data.chainsAssigned),
        },
  
        {
          label: "Price",
          key: "pricing",
          format: (v: any) => `$${v}`,
        },
      ],
    },
  ];
  
  export const clientConfirmConfig = [
    {
        title: "Basic Info",
        fields: [
            { label: "Client Number", key: "clientNumber" },
            { label: "Client Name", key: "clientName" },
            { label: "Chain", key: "chain", format: (value: { name: any; }) => value?.name ?? "-"},
            { label: "Payment Term", key: "paymentTerm", format: (value: { name: any; }) => value?.name ?? "-"},
            { label: "Credit Limit", key: "creditLimit" },
        ],
    },
    {
        title: "Address & Contact Info",
        fields: [
            { label: "Address Line", key: "addressLine" },
            { label: "City", key: "city" },
            { label: "State", key: "state"},
            { label: "Country", key: "country" },
            { label: "Zip Code", key: "zipCode" },
            { label: "Contact Name", key: "contactName" },
            { label: "Phone Number", key: "phoneNumber" },
        ],
    },
    {
        title: "Visiting Days",
        fields: [
            { label: "Frequency", key: "frequency" },
            { label: "Days", key: "visitingDays" },
        ],
    },
  ];

  export const supplierConfirmConfig = [
    {
        title: "Basic Info",
        fields: [
            {label: "Name", key:"name"},
            {label: "Contact", key:"contact"},
            {label: "Email", key:"email"},
            {label: "Phone Number", key:"phoneNumber"},
        ],
    },
    {
        title: "Address Info",
        fields: [
            {label: "Address Line", key:"addressLine"},
            {label: "City", key:"city"},
            {label: "State", key:"state"},
            {label: "Country", key:"country"},
            {label: "Zip Code", key:"zipCode"},
        ],
    },
  ];

  export const brandConfirmConfig = [
    {
        title: "Basic Info",
        fields: [
            {label: "Name", key:"name"},
        ],
    },
  ];

  export const chainConfirmConfig = [
    {
        title: "Basic Info",
        fields: [
            {label: "Name", key:"name"},
        ],
    },
  ];

  export function supplierOrderConfirmConfig({
    supplierMap,
  }: {
    supplierMap: Record<string, string>;
  }) { return [
    {
      title: "Order Info",
      fields: [
        { label: "PO Number", key: "poNumber", format:(number: string) => {
          const po: string[] = number.split("-");
           po[1] = (Number(po[1])+ 1).toString();
          return po[0] + "-" + po[1]; }},
        { label: "Status", key: "status" },
      ],
    },
    {
      title: "Supplier",
      fields: [
        {
          label: "Supplier Name",
          key: "supplier",
          format: (supplier: any) => supplierMap[supplier] ?? "-"
        }
      ],
    },
    {
      title: "Products",
      fields: [
        {
          label: "Items",
          key: "products",
          format: (products: any[]) => {
            if(!products?.length) return "-";
            return (
              <div className="flex border h-30 space-y-2 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-(--secondary)">
                    <tr className="border-b">
                      <th className="text-left p-2 font-bold">Product</th>
                      <th className="text-right p-2 font-bold">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p, i) => (
                      <tr key={i} className="border-b last:border-b-0">
                        <td className="p-2 capitalize">
                          {p.name?.toLowerCase()}
                        </td>
                        <td className="p-2 text-right">
                          {p.quantity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          },
        },
      ],
    },
    {
      title: "Totals",
      fields: [
        {
          label: "Expected Units",
          key: "products",
          format: (products: any[]) =>
            products?.reduce(
              (sum, p) => sum + (p.quantity ?? 0),
              0
            ) ?? 0
        },
        {
          label: "Expected Total",
          key: "expectedTotal",
          format: (v: number) => `$${v?.toFixed(2) ?? "0.00"}`
        }
      ]
    }
  ]
}

  export const supplierOrderReceiveConfirmConfig = [
    {
      title: "Order Info",
      fields: [
        { label: "Invoice Number", key: "invoice" },
      ],
    },
    {
      title: "Products",
      fields: [
        {
          label: "Items",
          key: "products",
          format: (products: any[]) =>
            products.map(p => `${p.name} (${p.quantity})`).join(", ")
        }
      ],
    },
    {
      title: "Totals",
      fields: [
        {
          label: "Total",
          key: "total",
          format: (v: number) => `$${v?.toFixed(2) ?? "0.00"}`
        }
      ]
    }
  ];
  
  