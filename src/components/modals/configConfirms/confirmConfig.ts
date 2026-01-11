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
export const productConfirmConfig = [
    {
        title: "Basic Information",
        fields: [
            { label: "Name", key: "name" },
            { label: "SKU", key: "sku" },
            { label: "Vendor SKU", key: "vendorSku" },
            { label: "UPC", key: "upc" },
            { label: "Brand", key: "brand", format: (value: { name: any; }) => value?.name ?? "-" },
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
];

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

  export const supplierOrderConfirmConfig = [
    {
      title: "Order Info",
      fields: [
        { label: "PO Number", key: "poNumber" },
        { label: "Status", key: "status" },
      ],
    },
    {
      title: "Supplier",
      fields: [
        {
          label: "Supplier Name",
          key: "supplier",
          format: (supplier: any) => supplier?.name ?? "-"
        }
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
          label: "Expected Total",
          key: "expectedTotal",
          format: (v: number) => `$${v?.toFixed(2) ?? "0.00"}`
        }
      ]
    }
  ];

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
  
  