import { Card, CardBody, CardHeader } from "@heroui/card";
import { Skeleton } from "@heroui/skeleton";

export default function Loading() {
    return (
        <section className="flex flex-col gap-6 py-2">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-bold">Service Status</h1>
                <p className="text-default-500">Real-time status updates for all services.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, index) => (
                    <Card key={index} className="w-full space-y-5 p-4" radius="lg">
                        <CardHeader className="flex gap-3 items-start pb-0">
                            <Skeleton className="rounded-lg">
                                <div className="h-10 w-10 rounded-lg bg-default-300"></div>
                            </Skeleton>
                            <div className="flex flex-col gap-2 w-full">
                                <Skeleton className="h-3 w-3/5 rounded-lg" />
                                <Skeleton className="h-3 w-4/5 rounded-lg" />
                            </div>
                        </CardHeader>
                        <CardBody className="space-y-3">
                            <div className="flex justify-between items-end">
                                <div className="space-y-2">
                                    <Skeleton className="h-2 w-16 rounded-lg" />
                                    <Skeleton className="h-4 w-12 rounded-lg" />
                                </div>
                                <div className="space-y-2 flex flex-col items-end">
                                    <Skeleton className="h-2 w-16 rounded-lg" />
                                    <Skeleton className="h-4 w-12 rounded-lg" />
                                </div>
                            </div>
                            <Skeleton className="rounded-lg">
                                <div className="h-12 w-full rounded-lg bg-default-300"></div>
                            </Skeleton>
                        </CardBody>
                    </Card>
                ))}
            </div>
        </section>
    );
}
