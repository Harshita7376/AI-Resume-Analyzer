import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { usePuterStore } from "~/lib/puter";

const formatBytes = (bytes: number | null | undefined) => {
    if (bytes == null || !Number.isFinite(bytes)) return "—";
    if (bytes < 1024) return `${bytes} B`;
    const units = ["KB", "MB", "GB", "TB"];
    let value = bytes / 1024;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit++;
    }
    return `${value.toFixed(1)} ${units[unit]}`;
};

const fileType = (file: FSItem) => {
    const extension = file.name.includes(".") ? file.name.split(".").pop() : "";
    return extension ? extension.toUpperCase() : "FILE";
};

const modifiedDate = (timestamp: number | null | undefined) => {
    if (!timestamp) return "—";
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
};

export default function WipeApp() {
    const { auth, isLoading, fs, kv, clearError } = usePuterStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [files, setFiles] = useState<FSItem[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [loadingFiles, setLoadingFiles] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [wiping, setWiping] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadFiles = useCallback(async () => {
        setLoadingFiles(true);
        setError(null);
        try {
            const items = await fs.readDir("./");
            setFiles((items ?? []).filter((file) => !file.is_dir));
            setSelected([]);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unable to load Puter files.");
        } finally {
            setLoadingFiles(false);
        }
    }, [fs]);

    useEffect(() => {
        if (!isLoading && !auth.isAuthenticated) {
            navigate(`/auth?next=${encodeURIComponent(location.pathname)}`, { replace: true });
        }
    }, [auth.isAuthenticated, isLoading, location.pathname, navigate]);

    useEffect(() => {
        if (!isLoading && auth.isAuthenticated) void loadFiles();
    }, [auth.isAuthenticated, isLoading, loadFiles]);

    const measurableBytes = useMemo(
        () => files.reduce((sum, file) => sum + (typeof file.size === "number" ? file.size : 0), 0),
        [files],
    );
    const allSelected = files.length > 0 && selected.length === files.length;

    const deleteFiles = async (targets: FSItem[]) => {
        setDeleting(true);
        setError(null);
        try {
            for (const file of targets) await fs.delete(file.path);
            await loadFiles();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unable to delete the selected files.");
        } finally {
            setDeleting(false);
        }
    };

    const deleteOne = (file: FSItem) => {
        if (window.confirm(`Delete “${file.name}” permanently? This cannot be undone.`)) {
            void deleteFiles([file]);
        }
    };

    const deleteSelected = () => {
        const targets = files.filter((file) => selected.includes(file.path));
        if (targets.length && window.confirm(`Permanently delete ${targets.length} selected file${targets.length === 1 ? "" : "s"}? This cannot be undone.`)) {
            void deleteFiles(targets);
        }
    };

    const wipeEverything = async () => {
        const confirmed = window.confirm(
            `PERMANENTLY WIPE EVERYTHING? This will delete all ${files.length} visible Puter file${files.length === 1 ? "" : "s"} and all Resumind app data stored in Puter KV. This action cannot be undone.`,
        );
        if (!confirmed) return;
        const typed = window.prompt('To confirm the permanent wipe, type "WIPE EVERYTHING".');
        if (typed !== "WIPE EVERYTHING") return;

        setWiping(true);
        setError(null);
        try {
            for (const file of files) await fs.delete(file.path);
            const flushed = await kv.flush();
            if (flushed !== true) throw new Error("Puter could not confirm that app data was cleared.");

            setFiles([]);
            setSelected([]);
            clearError();
            navigate("/", { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : "The wipe could not be completed.");
        } finally {
            setWiping(false);
        }
    };

    const busy = deleting || wiping;

    return (
        <main className="min-h-screen bg-gradient-to-b from-[#f4f5ff] via-[#f7f7ff] to-[#fce9ef] px-4 pb-12 pt-6 sm:px-8">
            <nav className="mx-auto flex w-full max-w-[1240px] items-center justify-between rounded-full bg-white/90 px-5 py-3 shadow-sm max-sm:flex-wrap max-sm:justify-center max-sm:gap-3 max-sm:rounded-2xl max-sm:px-4 sm:px-8">
                <Link to="/" className="text-2xl font-bold text-gradient">RESUMIND</Link>
                <div className="flex items-center gap-3 max-sm:w-full max-sm:flex-wrap max-sm:justify-center max-sm:gap-2">
                    <Link to="/auth" className="rounded-xl border border-indigo-100 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-indigo-50 max-sm:px-3">Logout</Link>
                    <Link to="/upload" className="primary-button w-fit px-6 text-center max-sm:px-4">Upload Resume</Link>
                </div>
            </nav>

            <div className="mx-auto mt-8 w-full max-w-[1240px] max-sm:min-w-0">
                <button
                    type="button"
                    className="mb-5 inline-flex items-center gap-2 rounded-xl border border-indigo-100 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white"
                    onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
                >
                    <span aria-hidden="true">←</span> Back
                </button>
                <header className="mb-7">
                    <p className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-indigo-500">Account settings</p>
                    <h1 className="text-4xl font-bold leading-tight text-slate-800 sm:text-5xl">Storage &amp; Wipe</h1>
                    <p className="mt-3 max-w-2xl text-base text-slate-600">Manage the files Resumind can see in your Puter storage and remove app data when you need to.</p>
                </header>

                {error && <div role="alert" className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">{error}</div>}

                <div className="grid items-start gap-6 max-sm:min-w-0 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.85fr)]">
                    <div className="space-y-6">
                        <section className="rounded-3xl border border-white bg-white/90 p-5 shadow-[0_14px_45px_rgba(76,81,150,0.08)] sm:p-7">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">Storage Used</h2>
                                    <p className="mt-1 text-sm text-slate-500">Based on files visible in your Puter root folder.</p>
                                </div>
                                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">Live file data</span>
                            </div>
                            <div className="mt-6 grid gap-4 sm:grid-cols-2">
                                <div className="rounded-2xl bg-gradient-to-br from-[#f2f3ff] to-[#f8f5ff] p-5">
                                    <p className="text-sm font-medium text-slate-500">Visible files</p>
                                    <p className="mt-2 text-3xl font-bold text-slate-800">{loadingFiles ? "…" : files.length}</p>
                                </div>
                                <div className="rounded-2xl bg-gradient-to-br from-[#f1f7ff] to-[#f4f2ff] p-5">
                                    <p className="text-sm font-medium text-slate-500">Measured file size</p>
                                    <p className="mt-2 text-3xl font-bold text-slate-800">{loadingFiles ? "…" : formatBytes(measurableBytes)}</p>
                                </div>
                            </div>
                            <p className="mt-4 text-xs leading-relaxed text-slate-400">Puter does not expose account quota or total storage usage through this app’s current API wrapper. Files without a reported size are excluded from the measured total.</p>
                        </section>

                        <section className="rounded-3xl border border-white bg-white/90 p-5 shadow-[0_14px_45px_rgba(76,81,150,0.08)] sm:p-7">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">Storage Breakdown</h2>
                                    <p className="mt-1 text-sm text-slate-500">Files and sizes returned by Puter.</p>
                                </div>
                                <span className="rounded-xl bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700">{loadingFiles ? "Loading…" : `${files.length} files`}</span>
                            </div>
                            <div className="mt-5 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4">
                                <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 text-lg">📄</span><div><p className="font-semibold text-slate-700">Files</p><p className="text-xs text-slate-500">Visible in Puter root</p></div></div>
                                <div className="text-right"><p className="font-bold text-slate-800">{loadingFiles ? "…" : formatBytes(measurableBytes)}</p><p className="text-xs text-slate-500">{loadingFiles ? "" : `${files.length} items`}</p></div>
                            </div>
                        </section>

                        <section className="overflow-hidden rounded-3xl border border-white bg-white/90 shadow-[0_14px_45px_rgba(76,81,150,0.08)]">
                            <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-6 sm:px-7">
                                <div><h2 className="text-xl font-bold text-slate-800">Your Files</h2><p className="mt-1 text-sm text-slate-500">Manage files currently returned from Puter.</p></div>
                                <button type="button" onClick={() => void loadFiles()} disabled={loadingFiles || busy} className="rounded-xl border border-indigo-100 bg-white px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 disabled:opacity-50">↻ Refresh</button>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-3 border-y border-slate-100 bg-slate-50/70 px-5 py-3 sm:px-7">
                                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-600">
                                    <input type="checkbox" className="m-0 h-4 w-4 shrink-0 bg-transparent p-0 shadow-none accent-indigo-600" checked={allSelected} disabled={!files.length || loadingFiles || busy} onChange={(event) => setSelected(event.target.checked ? files.map((file) => file.path) : [])} />
                                    Select all
                                </label>
                                <button type="button" onClick={deleteSelected} disabled={!selected.length || busy} className="rounded-xl bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50">{deleting ? "Deleting…" : `Delete selected${selected.length ? ` (${selected.length})` : ""}`}</button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[650px] text-left text-sm">
                                    <thead className="bg-white text-xs uppercase tracking-wider text-slate-400"><tr><th className="w-12 px-5 py-3 sm:px-7"><span className="sr-only">Select</span></th><th className="px-3 py-3">Name</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Size</th><th className="px-3 py-3">Modified</th><th className="px-5 py-3 sm:px-7"><span className="sr-only">Actions</span></th></tr></thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {loadingFiles ? <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">Loading your Puter files…</td></tr> : files.length === 0 ? <tr><td colSpan={6} className="px-6 py-12 text-center"><p className="font-semibold text-slate-700">No files found</p><p className="mt-1 text-sm text-slate-500">Files in your Puter root folder will appear here.</p></td></tr> : files.map((file) => <tr key={file.id} className="hover:bg-indigo-50/30">
                                            <td className="px-5 py-4 sm:px-7"><input aria-label={`Select ${file.name}`} type="checkbox" className="m-0 h-4 w-4 shrink-0 bg-transparent p-0 shadow-none accent-indigo-600" checked={selected.includes(file.path)} disabled={busy} onChange={(event) => setSelected((current) => event.target.checked ? [...current, file.path] : current.filter((path) => path !== file.path))} /></td>
                                            <td className="max-w-[240px] truncate px-3 py-4 font-semibold text-slate-700" title={file.name}>{file.name}</td><td className="px-3 py-4"><span className="rounded-lg bg-indigo-50 px-2 py-1 text-[11px] font-bold text-indigo-600">{fileType(file)}</span></td><td className="whitespace-nowrap px-3 py-4 text-slate-500">{formatBytes(file.size)}</td><td className="whitespace-nowrap px-3 py-4 text-slate-500">{modifiedDate(file.modified)}</td>
                                            <td className="px-5 py-4 text-right sm:px-7"><button type="button" aria-label={`Delete ${file.name}`} title="Delete file" disabled={busy} onClick={() => deleteOne(file)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50">⌫</button></td>
                                        </tr>)}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>

                    <aside className="space-y-5">
                        <section className="rounded-3xl border border-white bg-white/90 p-6 shadow-[0_14px_45px_rgba(76,81,150,0.08)]">
                            <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-2xl">☁</div>
                            <h2 className="text-lg font-bold text-slate-800">Puter Storage</h2>
                            <p className="mt-2 text-sm leading-relaxed text-slate-500">Your files are stored in your Puter account. Resumind can show the files and sizes returned by Puter, but this API does not provide account quota details.</p>
                            <div className="mt-5 rounded-2xl bg-indigo-50/70 p-4"><p className="text-xs font-bold uppercase tracking-wide text-indigo-500">Currently visible</p><p className="mt-1 text-xl font-bold text-slate-800">{loadingFiles ? "…" : `${files.length} files · ${formatBytes(measurableBytes)}`}</p></div>
                        </section>
                        <section className="rounded-3xl border border-white bg-white/90 p-6 shadow-[0_14px_45px_rgba(76,81,150,0.08)]">
                            <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-2xl">✓</div>
                            <h2 className="text-lg font-bold text-slate-800">Safe Cleanup</h2>
                            <p className="mt-2 text-sm leading-relaxed text-slate-500">Remove individual files or choose specific files from the table. Each deletion asks for confirmation and leaves your saved Resumind data intact.</p>
                        </section>
                        <section className="rounded-3xl border border-rose-100 bg-white/90 p-6 shadow-[0_14px_45px_rgba(76,81,150,0.08)]">
                            <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-2xl">⚠</div>
                            <h2 className="text-lg font-bold text-slate-800">Wipe App Data</h2>
                            <p className="mt-2 text-sm leading-relaxed text-slate-500">Permanently delete all visible files and clear Resumind’s saved app data from Puter KV. This cannot be undone.</p>
                            <button type="button" onClick={() => void wipeEverything()} disabled={busy || loadingFiles} className="mt-5 w-full rounded-xl bg-rose-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50">{wiping ? "Wiping data…" : "Wipe Everything"}</button>
                            <p className="mt-3 text-center text-xs text-slate-400">Requires two explicit confirmations</p>
                        </section>
                    </aside>
                </div>
            </div>
        </main>
    );
}
