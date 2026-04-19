import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import ThemeToggle from "./components/ThemeToggle";

const COMPLAINT_API = "/api/complaints";
const AUTH_API = "/api/auth";
const STATUS_REFRESH_MS = 10000;
const DEPARTMENT_OPTIONS = ["Household", "Government", "Private", "Other"];
const STATUS_OPTIONS = ["Pending", "In Progress", "Resolved"];
const SUBCATEGORY_BY_DEPARTMENT = {
  Government: [
    "Banking",
    "Post Office",
    "Government School",
    "Electricity Board",
    "Water Supply",
    "Transport (Bus/Railway)",
    "Municipality",
    "Police Department",
    "Government Hospital",
    "Tax Department",
    "Passport Office",
    "Land Records",
    "Court Services",
    "Public Distribution System",
    "Other",
  ],
  Private: [
    "Private Bank",
    "Private School",
    "E-commerce",
    "Telecom",
    "Internet Provider",
    "Private Hospital",
    "Delivery Services",
    "Real Estate",
    "Insurance",
    "Other",
  ],
  Household: [
    "Plumbing",
    "Electricity",
    "Cleaning",
    "Furniture",
    "Appliance Repair",
    "Pest Control",
    "Other",
  ],
  Other: ["Other"],
};
const INITIAL_FORM = {
  name: "",
  email: "",
  complaint: "",
  department: "Household",
  subcategory: "Plumbing",
  complaintTime: "",
};
const INITIAL_AUTH_FORM = { name: "", email: "", password: "" };
const INITIAL_ADMIN_FORM = { email: "", password: "" };
const AUTH_STORAGE_KEY = "grievance_auth";
const THEME_STORAGE_KEY = "grievance_theme";

const readStoredAuth = () => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { token: "", user: null };
  } catch (error) {
    return { token: "", user: null };
  }
};

const formatDate = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString();
};

const getErrorMessage = async (response, fallbackMessage) => {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await response.json().catch(() => ({}));
    return data.error || fallbackMessage;
  }
  return fallbackMessage;
};

const getNetworkErrorMessage = (error, fallbackMessage) => {
  if (error instanceof TypeError) {
    return "Cannot connect to backend. Start backend server on http://localhost:5000.";
  }
  return fallbackMessage;
};

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: "easeOut" },
};

function App() {
  const initialAuth = readStoredAuth();
  const [form, setForm] = useState(INITIAL_FORM);
  const [authForm, setAuthForm] = useState(INITIAL_AUTH_FORM);
  const [adminForm, setAdminForm] = useState(INITIAL_ADMIN_FORM);
  const [authMode, setAuthMode] = useState("login");
  const [token, setToken] = useState(initialAuth.token || "");
  const [user, setUser] = useState(initialAuth.user || null);
  const [complaints, setComplaints] = useState([]);
  const [page, setPage] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [historyByComplaint, setHistoryByComplaint] = useState({});
  const [selectedHistoryComplaintId, setSelectedHistoryComplaintId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isAdminAuthLoading, setIsAdminAuthLoading] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState(
    () => localStorage.getItem(THEME_STORAGE_KEY) || "dark"
  );

  const isAdminUser = user?.role === "admin";

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const subcategoryOptions = useMemo(() => {
    return SUBCATEGORY_BY_DEPARTMENT[form.department] || SUBCATEGORY_BY_DEPARTMENT.Other;
  }, [form.department]);

  const handleDepartmentChange = (event) => {
    const nextDepartment = event.target.value;
    const nextOptions = SUBCATEGORY_BY_DEPARTMENT[nextDepartment] || SUBCATEGORY_BY_DEPARTMENT.Other;
    setForm((prev) => ({
      ...prev,
      department: nextDepartment,
      subcategory: nextOptions[0] || "Other",
    }));
  };

  const handleAuthChange = (event) => {
    setAuthForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleAdminChange = (event) => {
    setAdminForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const apiRequest = useCallback(
    async (url, options = {}) => {
      const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(url, { ...options, headers });
      if (response.status === 401) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        setToken("");
        setUser(null);
        throw new Error("Session expired. Please login again.");
      }
      return response;
    },
    [token]
  );

  const fetchComplaints = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (statusFilter !== "All") params.set("status", statusFilter);
      if (departmentFilter !== "All") params.set("department", departmentFilter);
      if (search.trim()) params.set("search", search.trim());

      const endpoint = params.toString()
        ? `${COMPLAINT_API}/?${params.toString()}`
        : `${COMPLAINT_API}/`;
      const response = await apiRequest(endpoint);
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
  }, [apiRequest, departmentFilter, search, statusFilter, token]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  useEffect(() => {
    if (!token || page !== "dashboard") return undefined;
    const timer = setInterval(() => {
      fetchComplaints();
    }, STATUS_REFRESH_MS);
    return () => clearInterval(timer);
  }, [fetchComplaints, page, token]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!token) {
      setError("Please login to submit complaints.");
      return;
    }
    setIsSubmitting(true);
    setError("");

    try {
      const payload = {
        ...form,
        department: form.department || "Other",
        subcategory: (form.subcategory || "").trim(),
        complaintTime: form.complaintTime || new Date().toISOString(),
      };

      console.log("[DEBUG] handleSubmit payload:", JSON.stringify(payload, null, 2));
      console.log("[DEBUG] subcategory value:", payload.subcategory);

      if (!payload.subcategory) {
        setError("Please select a sub category.");
        setIsSubmitting(false);
        return;
      }

      const response = await apiRequest(`${COMPLAINT_API}/add`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit complaint.");
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
      const response = await apiRequest(`${COMPLAINT_API}/delete/${id}`, {
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

  const handleAdminUpdate = async (id, changes) => {
    setError("");
    try {
      let payload = changes;
      if (typeof changes.department !== "undefined") {
        const existing = complaints.find((c) => c._id === id);
        const nextDepartment = changes.department;
        const nextOptions =
          SUBCATEGORY_BY_DEPARTMENT[nextDepartment] || SUBCATEGORY_BY_DEPARTMENT.Other;
        const currentSubcategory = existing?.subcategory || "";
        const normalizedSubcategory = nextOptions.includes(currentSubcategory)
          ? currentSubcategory
          : nextOptions[0] || "Other";

        payload = {
          ...changes,
          subcategory: normalizedSubcategory,
        };
      }

      console.log("[DEBUG] handleAdminUpdate payload:", JSON.stringify(payload, null, 2));

      const response = await apiRequest(`${COMPLAINT_API}/update/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("Unable to update complaint.");
      }
      await fetchComplaints();
    } catch (updateError) {
      setError(updateError.message || "Update action failed.");
    }
  };

  const handleUserAuthSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsAuthLoading(true);

    try {
      const endpoint = authMode === "login" ? "login" : "register";
      const payload =
        authMode === "login"
          ? { email: authForm.email, password: authForm.password }
          : {
              name: authForm.name,
              email: authForm.email,
              password: authForm.password,
            };
      const response = await fetch(`${AUTH_API}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      setToken(data.token);
      setUser({ ...data.user, role: data.user.role || "user" });
      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
          token: data.token,
          user: { ...data.user, role: data.user.role || "user" },
        })
      );
      setAuthForm(INITIAL_AUTH_FORM);
      setPage("dashboard");
    } catch (authError) {
      setError(
        getNetworkErrorMessage(authError, authError.message || "Authentication failed.")
      );
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleAdminLogin = async (event) => {
    event.preventDefault();
    setError("");
    setIsAdminAuthLoading(true);

    try {
      const response = await fetch(`${AUTH_API}/admin-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adminForm),
      });
      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Admin authentication failed."));
      }
      const data = await response.json().catch(() => ({}));
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({ token: data.token, user: data.user })
      );
      setAdminForm(INITIAL_ADMIN_FORM);
      setPage("dashboard");
    } catch (authError) {
      setError(
        getNetworkErrorMessage(
          authError,
          authError.message || "Admin authentication failed."
        )
      );
    } finally {
      setIsAdminAuthLoading(false);
    }
  };

  const handleHistoryView = async (complaintId) => {
    setError("");
    try {
      const response = await apiRequest(`${COMPLAINT_API}/history/${complaintId}`);
      if (!response.ok) {
        throw new Error("Could not load history.");
      }
      const data = await response.json();
      setHistoryByComplaint((prev) => ({ ...prev, [complaintId]: data }));
      setSelectedHistoryComplaintId(complaintId);
    } catch (historyError) {
      setError(historyError.message || "History fetch failed.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setToken("");
    setUser(null);
    setComplaints([]);
    setForm(INITIAL_FORM);
    setStatusFilter("All");
    setDepartmentFilter("All");
    setSearch("");
    setSelectedHistoryComplaintId("");
    setHistoryByComplaint({});
    setPage("dashboard");
  };

  const filteredComplaints = useMemo(() => {
    if (isAdminUser) return complaints;
    return complaints.filter((item) =>
      [item.name, item.email, item.complaint, item.status, item.subcategory]
        .join(" ")
        .toLowerCase()
        .includes(search.trim().toLowerCase())
    );
  }, [complaints, isAdminUser, search]);

  const total = complaints.length;
  const resolved = complaints.filter((item) => item.status === "Resolved").length;
  const pending = complaints.filter((item) => item.status !== "Resolved").length;
  const resolutionRate = total ? Math.round((resolved / total) * 100) : 0;
  const selectedHistory = selectedHistoryComplaintId
    ? historyByComplaint[selectedHistoryComplaintId] || []
    : [];

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-100 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="floating-blob absolute -left-16 top-24 h-72 w-72 rounded-full bg-indigo-400/25 blur-3xl dark:bg-indigo-500/30" />
        <div className="floating-blob-delayed absolute right-0 top-1/3 h-80 w-80 rounded-full bg-sky-400/20 blur-3xl dark:bg-sky-500/25" />
        <div className="floating-blob-slow absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-fuchsia-400/20 blur-3xl dark:bg-fuchsia-500/20" />
      </div>
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-8">
        <motion.header
          {...fadeUp}
          className="mb-8 rounded-3xl border border-slate-200/70 bg-gradient-to-r from-indigo-200/60 via-sky-100/60 to-teal-100/60 p-6 shadow-lg shadow-slate-300/40 backdrop-blur dark:border-slate-700/50 dark:from-indigo-600/40 dark:via-sky-500/25 dark:to-teal-400/25 dark:shadow-2xl dark:shadow-slate-950/40"
        >
          <div className="mb-4 flex justify-end">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300">
            Grievance Management
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
                Modern Complaint Control Center
              </h1>
              <p className="mt-2 text-slate-600 dark:text-slate-300">
                Manage grievances across user and admin portals.
              </p>
              {user && (
                <p className="mt-2 text-sm text-indigo-700 dark:text-indigo-100/90">
                  Welcome, {user.name} ({isAdminUser ? "Admin" : "User"})
                </p>
              )}
            </div>
            {token && (
              <div className="inline-flex rounded-full border border-slate-300 bg-white/70 p-1 shadow-lg shadow-slate-300/40 backdrop-blur dark:border-slate-600 dark:bg-slate-900/50 dark:shadow-slate-900/60">
                {!isAdminUser && (
                  <button
                    onClick={() => setPage("form")}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
                      page === "form"
                        ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-800/40"
                        : "text-slate-700 hover:bg-slate-200/80 hover:shadow-md dark:text-slate-300 dark:hover:bg-slate-700/70"
                    }`}
                  >
                    Submit Complaint
                  </button>
                )}
                <button
                  onClick={() => setPage("dashboard")}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
                    page === "dashboard"
                      ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-800/40"
                      : "text-slate-700 hover:bg-slate-200/80 hover:shadow-md dark:text-slate-300 dark:hover:bg-slate-700/70"
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={handleLogout}
                  className="rounded-full px-4 py-2 text-sm font-medium text-rose-600 transition-all duration-300 hover:bg-rose-500/20 hover:shadow-md dark:text-rose-200"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </motion.header>

        {error && (
          <div className="mb-6 rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/30 dark:text-rose-200">
            {error}
          </div>
        )}

        {!token && (
          <motion.section
            {...fadeUp}
            className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/55 shadow-xl shadow-slate-300/30 backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/55 dark:shadow-2xl dark:shadow-slate-900/80"
          >
            <div className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-px bg-gradient-to-b from-transparent via-indigo-400/70 to-transparent lg:block" />
            <div className="grid min-h-[74vh] grid-cols-1 lg:grid-cols-2">
              <motion.article
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.25 }}
                className="flex h-full flex-col justify-center border-b border-slate-200/70 bg-white/25 p-8 backdrop-blur-md transition-all duration-300 lg:border-b-0 lg:border-r dark:border-slate-700/70 dark:bg-slate-900/20"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500 dark:text-indigo-300">
                  User Access
                </p>
                <h2 className="mt-2 flex items-center gap-2 text-3xl font-semibold">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-200">
                    👤
                  </span>
                  User Login
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Login or create an account to submit and monitor complaints.
                </p>
                <form onSubmit={handleUserAuthSubmit} className="mt-6 space-y-4">
                  {authMode === "register" && (
                    <div>
                      <label className="mb-1 block text-sm text-slate-600 dark:text-slate-300">Name</label>
                      <input
                        className="w-full rounded-xl border border-slate-300/90 bg-white/80 px-4 py-3 outline-none transition-all duration-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/30 dark:border-slate-600 dark:bg-slate-800/80"
                        name="name"
                        placeholder="Your name"
                        value={authForm.name}
                        onChange={handleAuthChange}
                        required
                      />
                    </div>
                  )}
                  <div>
                    <label className="mb-1 block text-sm text-slate-600 dark:text-slate-300">Email</label>
                    <input
                      className="w-full rounded-xl border border-slate-300/90 bg-white/80 px-4 py-3 outline-none transition-all duration-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/30 dark:border-slate-600 dark:bg-slate-800/80"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      value={authForm.email}
                      onChange={handleAuthChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-600 dark:text-slate-300">Password</label>
                    <input
                      className="w-full rounded-xl border border-slate-300/90 bg-white/80 px-4 py-3 outline-none transition-all duration-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/30 dark:border-slate-600 dark:bg-slate-800/80"
                      name="password"
                      type="password"
                      minLength={6}
                      placeholder="Minimum 6 characters"
                      value={authForm.password}
                      onChange={handleAuthChange}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isAuthLoading}
                    className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-3 font-medium text-white shadow-lg shadow-indigo-900/40 transition-all duration-300 hover:-translate-y-0.5 hover:from-indigo-400 hover:to-violet-400 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isAuthLoading
                      ? "Please wait..."
                      : authMode === "login"
                      ? "Login"
                      : "Create Account"}
                  </button>
                </form>
                <button
                  onClick={() =>
                    setAuthMode((prev) => (prev === "login" ? "register" : "login"))
                  }
                  className="mt-4 text-sm text-indigo-600 underline underline-offset-4 hover:text-indigo-500 dark:text-indigo-300 dark:hover:text-indigo-200"
                >
                  {authMode === "login"
                    ? "Create Account"
                    : "Already have an account? Login"}
                </button>
              </motion.article>

              <motion.article
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.25 }}
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative flex h-full flex-col justify-center overflow-hidden p-8 transition-all duration-300"
                style={{
                  backgroundImage:
                    "url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1400&q=80')",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }}
              >
  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-950/95 via-slate-950/85 to-sky-950/85" />
                <div className="pointer-events-none absolute inset-0 backdrop-blur-[1px]" />
                <div className="relative z-10 rounded-2xl border border-white/15 bg-slate-900/30 p-6 shadow-2xl shadow-slate-950/70 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-500 dark:text-sky-300">
                  Admin Access
                </p>
    <h2 className="mt-2 flex items-center gap-2 text-3xl font-semibold text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.65)]">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/20 text-sky-700 dark:text-sky-200">
                    🛡️
                  </span>
                  Admin Login
                </h2>
    <p className="mt-2 text-sm text-slate-100">
                  Access the admin dashboard to manage complaints and updates.
                </p>
                <form onSubmit={handleAdminLogin} className="mt-6 space-y-4">
                  <div>
        <label className="mb-1 block text-sm text-gray-200">Admin Email</label>
                    <input
          className="w-full rounded-xl border border-white/30 bg-white/92 px-4 py-3 text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-500 focus:border-sky-400 focus:ring-4 focus:ring-sky-500/30"
                      name="email"
                      type="email"
                      placeholder="admin@grievance.com"
                      value={adminForm.email}
                      onChange={handleAdminChange}
                      required
                    />
                  </div>
                  <div>
        <label className="mb-1 block text-sm text-gray-200">
                      Admin Password
                    </label>
                    <input
          className="w-full rounded-xl border border-white/30 bg-white/92 px-4 py-3 text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-500 focus:border-sky-400 focus:ring-4 focus:ring-sky-500/30"
                      name="password"
                      type="password"
                      placeholder="Enter admin password"
                      value={adminForm.password}
                      onChange={handleAdminChange}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isAdminAuthLoading}
                    className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-3 font-medium text-white shadow-lg shadow-sky-900/40 transition-all duration-300 hover:-translate-y-0.5 hover:from-sky-400 hover:to-cyan-400 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isAdminAuthLoading ? "Please wait..." : "Admin Login"}
                  </button>
                </form>
                </div>
              </motion.article>
            </div>
          </motion.section>
        )}

        {token && !isAdminUser && page === "form" && (
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
                <label className="mb-1 block text-sm text-slate-300">Department</label>
                <select
                  className="w-full rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-3 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40"
                  name="department"
                  value={form.department}
                  onChange={handleDepartmentChange}
                  required
                >
                  {DEPARTMENT_OPTIONS.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-300">Sub Category</label>
                <select
                  key={form.department}
                  className="w-full rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-3 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40"
                  name="subcategory"
                  value={form.subcategory}
                  onChange={handleChange}
                  required
                >
                  {subcategoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-300">
                  Complaint Time
                </label>
                <input
                  className="w-full rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-3 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40"
                  name="complaintTime"
                  type="datetime-local"
                  value={form.complaintTime}
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

        {token && page === "dashboard" && (
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
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <h2 className="text-xl font-semibold">
                  {isAdminUser ? "Admin Complaint Console" : "My Complaints"}
                </h2>
                <div className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-3xl">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={
                      isAdminUser
                        ? "Search by name, email, complaint..."
                        : "Search complaints..."
                    }
                    className="w-full rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40"
                  />
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40"
                  >
                    <option value="All">All Status</option>
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <select
                    value={departmentFilter}
                    onChange={(event) => setDepartmentFilter(event.target.value)}
                    className="rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40"
                  >
                    <option value="All">All Departments</option>
                    {DEPARTMENT_OPTIONS.map((department) => (
                      <option key={department} value={department}>
                        {department}
                      </option>
                    ))}
                  </select>
                </div>
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
                    Try different filters or search terms.
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
                        <th className="px-4 py-3 font-medium">
                          {isAdminUser ? "Forward To Department" : "Department"}
                        </th>
                        <th className="px-4 py-3 font-medium">Subcategory</th>
                        <th className="px-4 py-3 font-medium">Complaint Time</th>
                        <th className="px-4 py-3 font-medium">Created At</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        {isAdminUser && (
                          <th className="px-4 py-3 font-medium text-right">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                      {filteredComplaints.map((item) => (
                        <tr key={item._id} className="align-top">
                          <td className="px-4 py-3 font-medium text-slate-100">
                            {item.name}
                          </td>
                          <td className="px-4 py-3 text-slate-300">{item.email}</td>
                          <td className="max-w-sm px-4 py-3 text-slate-200">
                            {item.complaint}
                          </td>
                          <td className="px-4 py-3 text-slate-200">
                            {isAdminUser ? (
                              <select
                                value={item.department || "Other"}
                                onChange={(event) =>
                                  handleAdminUpdate(item._id, {
                                    department: event.target.value,
                                  })
                                }
                                className="rounded-lg border border-slate-600 bg-slate-800 px-2 py-1 text-xs outline-none"
                              >
                                {DEPARTMENT_OPTIONS.map((department) => (
                                  <option key={department} value={department}>
                                    {department}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              item.department || "Other"
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-200">
                            {isAdminUser ? (
                              <select
                                value={item.subcategory || ""}
                                onChange={(event) =>
                                  handleAdminUpdate(item._id, {
                                    subcategory: event.target.value,
                                  })
                                }
                                className="rounded-lg border border-slate-600 bg-slate-800 px-2 py-1 text-xs outline-none"
                              >
                                {(SUBCATEGORY_BY_DEPARTMENT[item.department] || SUBCATEGORY_BY_DEPARTMENT.Other).map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              item.subcategory || "N/A"
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-200">
                            {formatDate(item.complaintTime || item.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-slate-200">
                            {formatDate(item.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            {isAdminUser ? (
                              <select
                                value={item.status || "Pending"}
                                onChange={(event) =>
                                  handleAdminUpdate(item._id, {
                                    status: event.target.value,
                                  })
                                }
                                className="rounded-lg border border-slate-600 bg-slate-800 px-2 py-1 text-xs outline-none"
                              >
                                {STATUS_OPTIONS.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                  item.status === "Resolved"
                                    ? "bg-emerald-500/20 text-emerald-300"
                                    : item.status === "In Progress"
                                    ? "bg-sky-500/20 text-sky-300"
                                    : "bg-amber-500/20 text-amber-300"
                                }`}
                              >
                                {item.status || "Pending"}
                              </span>
                            )}
                          </td>
                          {isAdminUser && (
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => {
                                    const currentIndex = STATUS_OPTIONS.indexOf(
                                      item.status || "Pending"
                                    );
                                    const nextStatus =
                                      STATUS_OPTIONS[
                                        Math.min(
                                          currentIndex + 1,
                                          STATUS_OPTIONS.length - 1
                                        )
                                      ];
                                    if (nextStatus !== (item.status || "Pending")) {
                                      handleAdminUpdate(item._id, { status: nextStatus });
                                    }
                                  }}
                                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500"
                                >
                                  Next Status
                                </button>
                                <button
                                  onClick={() => handleHistoryView(item._id)}
                                  className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-400"
                                >
                                  View History
                                </button>
                                <button
                                  onClick={() => handleDelete(item._id)}
                                  className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-400"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {isAdminUser && selectedHistoryComplaintId && (
              <section className="rounded-3xl border border-slate-700/70 bg-slate-900/70 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Complaint History</h3>
                  <button
                    onClick={() => setSelectedHistoryComplaintId("")}
                    className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-slate-600"
                  >
                    Close
                  </button>
                </div>
                {selectedHistory.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    No updates recorded for this complaint yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {selectedHistory.map((entry) => (
                      <li
                        key={entry._id || `${entry.timestamp}-${entry.action}`}
                        className="rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm"
                      >
                        <p className="text-slate-100">{entry.action}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {entry.changedBy} - {formatDate(entry.timestamp)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

export default App;