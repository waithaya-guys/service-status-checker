import { Spinner } from "@heroui/spinner";

export default function Loading() {
    return (
        <div className="flex justify-center items-center h-[50vh]">
            <Spinner size="lg" color="primary" label="Loading..." />
        </div>
    );
}
