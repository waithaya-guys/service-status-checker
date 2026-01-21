"use client";

import { DayStatus } from "@/lib/statistics";
import { Tooltip } from "@heroui/tooltip";

interface StatusTimelineProps {
    timeline: DayStatus[];
}

export function StatusTimeline({ timeline }: StatusTimelineProps) {
    return (
        <div className="flex gap-1 w-full justify-between mt-4">
            {timeline.map((day, index) => {
                let colorClass = "bg-default-200"; // empty
                if (day.status === "up") colorClass = "bg-success";
                if (day.status === "down") colorClass = "bg-danger";
                if (day.status === "degraded") colorClass = "bg-warning";

                return (
                    <Tooltip key={index} content={`${day.date}: ${day.status.toUpperCase()}`}>
                        <div
                            className={`h-8 flex-1 rounded-sm ${colorClass} hover:opacity-80 transition-opacity`}
                        />
                    </Tooltip>
                );
            })}
        </div>
    );
}
