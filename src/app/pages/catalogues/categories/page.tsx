import CategoryOrderScreen from "@/components/ui/CategoryOrder";

export default function CategoriesPage() {
    return (
      <div className="flex flex-col flex-1 w-full h-full p-2">
        <h1 className="text-4xl font-bold text-center dark:text-white">Categories</h1>
        <CategoryOrderScreen/>
      </div>
    );
  }