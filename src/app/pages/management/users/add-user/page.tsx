import AddUserWizard from "@/components/forms/AddUserWizard/AddUserWizard";

export default function AddUserPage() {
    return (
        <div className="flex flex-1 flex-col w-full gap-5 p-5 items-center justify-center">
            <h2 className="text-2xl font-bold text-center">
                Create User
            </h2>
            <AddUserWizard></AddUserWizard>
        </div>
    );
  }