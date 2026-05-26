import LoadRequestReviewScreen from "@/components/load-requests/LoadRequestReviewScreen";

export default async function Page({
    params,
}: {
    params: Promise<{id: string}>;
}) {
    const { id } = await params;
    return (
        <div className="flex flex-col flex-1 w-full h-full p-5">
            <h1 className="text-4xl font-bold text-center mb-5 dark:text-white">Load Requests</h1>
            <LoadRequestReviewScreen loadRequestId={id} />
        </div>
      );
}