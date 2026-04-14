import { useEffect, useMemo, useState } from "react";

const API_BASE = "http://localhost:5000/api/complaints";
const INITIAL_FORM = { name: "", email: "", complaint: "" };

function App() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [complaints, setComplaints] = useState([]);
  const [page, setPage] = useState("form");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const fetchComplaints = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE}/`);
      if (!response.ok) {
        throw new Error("Could not load complaints.");
      }
      const data = await response.json();
      setComplaints(data);
    } catch (fetchError) {
      setError(fetchError.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error("Failed to submit complaint.");
      }

      setForm(INITIAL_FORM);
      await fetchComplaints();
      setPage("dashboard");
    } catch (submitError) {
      setError(submitError.message || "Submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    setError("");
    try {
      const response = await fetch(`${API_BASE}/delete/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Unable to delete complaint.");
      }
      await fetchComplaints();
    } catch (deleteError) {
      setError(deleteError.message || "Delete action failed.");
    }
  };

  const handleResolve = async (id) => {
    setError("");
    try {
      const response = await fetch(`${API_BASE}/update/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Resolved" }),
      });
      if (!response.ok) {
        throw new Error("Unable to update complaint.");
      }
      await fetchComplaints();
    } catch (resolveError) {
      setError(resolveError.message || "Resolve action failed.");
    }
  };

  const filteredComplaints = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return complaints;
    }
    return complaints.filter((item) =>
      [item.name, item.email, item.complaint, item.status]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [complaints, search]);

  const total = complaints.length;
  const resolved = complaints.filter(
    (complaintItem) => complaintItem.status === "Resolved"
  ).length;
  const pending = total - resolved;
  const resolutionRate = total ? Math.round((resolved / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <header className="mb-8 rounded-3xl border border-slate-700/50 bg-gradient-to-r from-indigo-600/40 via-sky-500/25 to-teal-400/25 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-300">
            Grievance Management
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
                Modern Complaint Control Center
              </h1>
              <p className="mt-2 text-slate-300">
                Submit concerns quickly and track resolution progress in one
                place.
              </p>
            </div>
            <div className="inline-flex rounded-full border border-slate-600 bg-slate-900/50 p-1">
              <button
                onClick={() => setPage("form")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  page === "form"
                    ? "bg-indigo-500 text-white shadow-lg shadow-indigo-800/40"
                    : "text-slate-300 hover:bg-slate-700/70"
                }`}
              >
                Submit
              </button>
              <button
                onClick={() => setPage("dashboard")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  page === "dashboard"
                    ? "bg-indigo-500 text-white shadow-lg shadow-indigo-800/40"
                    : "text-slate-300 hover:bg-slate-700/70"
                }`}
              >
                Dashboard
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        {page === "form" && (
          <section className="mx-auto max-w-2xl rounded-3xl border border-slate-700/70 bg-slate-900/70 p-6 shadow-2xl shadow-slate-900/80">
            <h2 className="text-2xl font-semibold">Submit a Complaint</h2>
            <p className="mt-1 text-sm text-slate-400">
              Your input helps us improve service quality.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm text-slate-300">Name</label>
                <input
                  className="w-full rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-3 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40"
                  name="name"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-300">Email</label>
                <input
                  className="w-full rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-3 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40"
                  name="email"
                  type="email"
                  placeholder="john@example.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-300">
                  Complaint Details
                </label>
                <textarea
                  className="min-h-36 w-full rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-3 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40"
                  name="complaint"
                  placeholder="Describe your issue in detail..."
                  value={form.complaint}
                  onChange={handleChange}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-indigo-500 px-4 py-3 font-medium text-white shadow-lg shadow-indigo-900/40 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Submitting..." : "Submit Complaint"}
              </button>
            </form>
          </section>
        )}

        {page === "dashboard" && (
          <section className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-5">
                <p className="text-sm text-slate-400">Total Complaints</p>
                <h3 className="mt-2 text-3xl font-semibold">{total}</h3>
              </article>
              <article className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-5">
                <p className="text-sm text-slate-400">Open Cases</p>
                <h3 className="mt-2 text-3xl font-semibold text-amber-300">
                  {pending}
                </h3>
              </article>
              <article className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-5">
                <p className="text-sm text-slate-400">Resolved Cases</p>
                <h3 className="mt-2 text-3xl font-semibold text-emerald-300">
                  {resolved}
                </h3>
              </article>
              <article className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-5">
                <p className="text-sm text-slate-400">Resolution Rate</p>
                <h3 className="mt-2 text-3xl font-semibold text-sky-300">
                  {resolutionRate}%
                </h3>
              </article>
            </div>

            <div className="rounded-3xl border border-slate-700/70 bg-slate-900/70 p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-semibold">Recent Complaints</h2>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, email, complaint, status..."
                  className="w-full rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40 sm:max-w-sm"
                />
              </div>

              {isLoading ? (
                <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-6 text-center text-slate-300">
                  Loading complaints...
                </div>
              ) : filteredComplaints.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-600 bg-slate-800/40 p-8 text-center">
                  <p className="text-lg font-medium text-slate-200">
                    No complaints found
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Try a different search term or submit a new complaint.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-700">
                  <table className="min-w-full divide-y divide-slate-700 text-sm">
                    <thead className="bg-slate-800/90 text-left text-slate-300">
                      <tr>
                        <th className="px-4 py-3 font-medium">Name</th>
                        <th className="px-4 py-3 font-medium">Email</th>
                        <th className="px-4 py-3 font-medium">Complaint</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium text-right">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                      {filteredComplaints.map((item) => (
                        <tr key={item._id} className="align-top">
                          <td className="px-4 py-3 font-medium text-slate-100">
                            {item.name}
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            {item.email}
                          </td>
                          <td className="max-w-sm px-4 py-3 text-slate-200">
                            {item.complaint}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                item.status === "Resolved"
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : "bg-amber-500/20 text-amber-300"
                              }`}
                            >
                              {item.status || "Pending"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleResolve(item._id)}
                                className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-400"
                              >
                                Resolve
                              </button>
                              <button
                                onClick={() => handleDelete(item._id)}
                                className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-400"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default App;