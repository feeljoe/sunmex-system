import { ProductsTable } from "@/components/tables/ProductsTable";
export default function ProductsPage() {
    return (
        <div className="flex flex-col flex-1 w-full h-full p-5">
            <h1 className="text-4xl font-bold text-center dark:text-white">Products</h1>
            <ProductsTable/>
        </div>
    );
  }
  