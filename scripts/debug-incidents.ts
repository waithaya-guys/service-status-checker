import { getIncidents, getServices } from "../lib/storage";
import { Incident } from "../types/monitoring";

async function main() {
    const incidents = await getIncidents();
    const services = await getServices();

    console.log(`Total Incidents: ${incidents.length}`);

    // Group by service
    const serviceIncidents = new Map<string, Incident[]>();
    for (const incident of incidents) {
        if (!serviceIncidents.has(incident.serviceId)) {
            serviceIncidents.set(incident.serviceId, []);
        }
        serviceIncidents.get(incident.serviceId)?.push(incident);
    }

    console.log("\n--- Active Incidents Analysis ---");
    for (const service of services) {
        const serviceIncs = serviceIncidents.get(service.id) || [];
        const activeIncs = serviceIncs.filter(i => !i.endTime);

        if (activeIncs.length > 0) {
            console.log(`Service: ${service.name} (${service.id})`);
            console.log(`- Total Incidents: ${serviceIncs.length}`);
            console.log(`- Active Incidents: ${activeIncs.length}`);
            activeIncs.forEach(i => {
                console.log(`  > ID: ${i.id}, Start: ${i.startTime}, Desc: ${i.description}`);
            });
        }
    }
}

main().catch(console.error);
