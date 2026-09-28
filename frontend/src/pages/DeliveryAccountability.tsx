import { Link } from "react-router-dom";
import { useState } from "react";
import { CockpitBar } from "@/components/CockpitBar";
import { useCockpit } from "@/hooks/use-cockpit";
import { listAllActivities } from "@/lib/activities-store";

export default function DeliveryAccountability() {
  const [activities] = useState(listAllActivities);
  const { geography, district } = useCockpit();
  const scoped = geography === "District"
    ? activities.filter(activity => activity.districts.includes(district))
    : activities;
  return <div className="flex min-h-full flex-col">
    <CockpitBar allowDistrict />
    <section className="mx-auto w-full max-w-6xl space-y-4 p-4 sm:p-8">
      <h1 className="text-2xl font-bold">Delivery & Accountability</h1>
      <p className="text-muted-foreground">Activities entered on this device. These are user submissions; their status does not establish independently verified national delivery.</p>
      <Link className="inline-block font-semibold text-primary underline" to="/my-work">Manage activities and evidence</Link>
      {scoped.length === 0 ? <p className="rounded-sm border p-5">No submitted activities are available for this selection. No national delivery total can be calculated.</p>
        : <ul className="grid gap-4 md:grid-cols-2">{scoped.map(activity => <li key={activity.id} className="space-y-2 rounded-sm border p-5">
          <Link className="font-semibold text-primary underline" to={`/activities/${activity.id}`}>{activity.title}</Link>
          <p>{activity.organization ?? "Organization not recorded"}</p>
          <p className="text-sm text-muted-foreground">{activity.districts.join(", ") || "Location not recorded"} · {activity.workflow_state}</p>
        </li>)}</ul>}
    </section>
  </div>;
}
