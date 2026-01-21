
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { Card, CardBody } from "@heroui/card";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect("/api/auth/signin");
    }

    const hasPermission = session.roles?.includes("G-IT") || process.env.NODE_ENV === "development";

    if (!hasPermission) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-64px)] p-4">
                <Card className="w-full max-w-md bg-danger-50 border-danger border">
                    <CardBody className="text-center py-8">
                        <h1 className="text-2xl font-bold text-danger mb-2">Access Denied</h1>
                        <p className="text-default-600">
                            You do not have permission to access the Admin Panel.
                        </p>
                        <p className="text-default-500 text-sm mt-2">
                            Required Role: <strong>G-IT</strong>
                        </p>
                    </CardBody>
                </Card>
            </div>
        );
    }

    return <>{children}</>;
}
