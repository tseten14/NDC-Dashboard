import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCountry } from "@/context/CountryContext";
import { downloadFile, exportPackage, readExercises, type Exercise } from "@/lib/inventory-workspace";

const SAMPLE_DATA_ENABLED = import.meta.env.DEV;

export default function ClassificationArchive() {
  const { country } = useCountry();
  const [loaded] = useState(() => {
    try { return { exercises: country ? readExercises(country.code).filter(exercise => SAMPLE_DATA_ENABLED || !exercise.sample) : [] as Exercise[], error: "" }; }
    catch { return { exercises: [] as Exercise[], error: "Saved exercises could not be read. Your browser data has not been changed." }; }
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = loaded.exercises.find((entry) => entry.id === selectedId);
  return <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
    <Link to="/sector-classification" className="text-sm text-primary underline">← Sector Classification</Link>
    <h1 className="mt-4 text-3xl font-bold">Saved exercise archive</h1>
    <p className="mt-3 max-w-3xl text-base text-muted-foreground">Exercises saved in this browser remain available to inspect and export. This archive is read-only; the current Sector Classification view uses Climate TRACE API data.</p>
    {loaded.error && <p role="alert" className="mt-6 border p-4">{loaded.error}</p>}
    {!loaded.error && !loaded.exercises.length && <p className="mt-6 border p-5">No saved exercises were found on this device.</p>}
    {!!loaded.exercises.length && <div className="mt-6 grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <section aria-label="Saved exercises" className="space-y-2">{loaded.exercises.map((exercise) => <button key={exercise.id} className="block w-full rounded-sm border bg-card p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" aria-pressed={selectedId === exercise.id} onClick={() => setSelectedId(exercise.id)}><span className="block font-semibold">{exercise.name}</span><span className="mt-1 block text-sm text-muted-foreground">{exercise.selection.selectedCodes.length} categories · Updated {new Date(exercise.updatedAt).toLocaleDateString()}{exercise.sample ? " · Sample" : ""}</span></button>)}</section>
      <section aria-label="Exercise details" className="min-w-0 border bg-card p-5">{selected ? <><h2 className="text-xl font-bold">{selected.name}</h2><p className="mt-1 text-sm text-muted-foreground">{selected.status === "ready" ? "Ready for sign-off" : "Draft"} · Saved on this device</p><dl className="mt-5 grid grid-cols-2 gap-4 text-sm"><div><dt className="font-semibold">Framework</dt><dd>{selected.selection.frameworkId}</dd></div><div><dt className="font-semibold">Reporting years</dt><dd>{selected.start}–{selected.end}</dd></div><div><dt className="font-semibold">Categories</dt><dd>{selected.selection.selectedCodes.join(", ") || "None"}</dd></div><div><dt className="font-semibold">Imported sources</dt><dd>{selected.sources.length}</dd></div></dl><h3 className="mt-6 font-semibold">Source records</h3>{selected.sources.length ? <ul className="mt-2 space-y-2 text-sm">{selected.sources.map((source) => <li key={source.id} className="border-t pt-2">{source.name} · {source.rows.length} observations · {source.unit}</li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">No source data was imported.</p>}<Button className="mt-6" onClick={() => downloadFile(`inventory-exercise-${selected.id}.json`, JSON.stringify(exportPackage(selected), null, 2))}>Export exercise backup</Button></> : <p className="text-sm text-muted-foreground">Select an exercise to inspect its summary and export its full backup.</p>}</section>
    </div>}
  </div>;
}
