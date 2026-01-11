import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function DashboardPage(){
    const session = await getServerSession(authOptions);

    return (
        <div className="flex flex-col flex-1 w-full h-full gap-5 p-5">
            <div>Dashboard Content</div>
            <p>Welcome, {session?.user?.name}</p>
            <p>Session: {(session as any)?.userId}</p>
            <p>ROLE: {session?.user.role}</p>
        </div>
    );
}