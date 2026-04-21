"use client";

import { useState, useEffect } from "react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User, Shield, Sliders, Users, BookOpen, Headphones,
  Bookmark, Eye, EyeOff, Trash2, Plus, X, ChevronRight, Loader2,
  RefreshCw, Calendar, BarChart2, HardDrive, Download,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { apiFetch } from "@/lib/api";
import { isNative } from "@/lib/native";
import { listOfflineBooks, deleteOfflineBook, totalOfflineBytes } from "@/lib/offline";

// ─── Types ───────────────────────────────────────────────────────────────────
type Section = "profile" | "security" | "preferences" | "storage" | "users";

const ADMIN_EMAIL = "wedigcreativity@gmail.com";

const NAV = [
  { key: "profile" as Section,     label: "Profile",      icon: User,    desc: "Your name and account info" },
  { key: "security" as Section,    label: "Security",     icon: Shield,  desc: "Password and sign-in" },
  { key: "preferences" as Section, label: "Preferences",  icon: Sliders, desc: "Voice, speed, and reading defaults" },
];

const STORAGE_NAV = { key: "storage" as Section, label: "Storage", icon: HardDrive, desc: "Manage downloaded books on this device" };

const ADMIN_NAV = [
  { key: "users" as Section, label: "Users", icon: Users, desc: "Manage accounts" },
];

// ─── Shared UI ───────────────────────────────────────────────────────────────
const inputCls = "w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-6 ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
        <Icon size={18} className="text-primary" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Profile Section ─────────────────────────────────────────────────────────
function ProfileSection() {
  const { user: currentUser } = useCurrentUser();
  const [name, setName] = useState(currentUser?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setName(currentUser?.name ?? ""); }, [currentUser]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await apiFetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  return (
    <Card>
      <SectionHeader icon={User} title="Profile" subtitle="Update your display name" />
      <form onSubmit={handleSave} className="space-y-4 max-w-sm">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Display name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
          <input
            value={currentUser?.email ?? ""}
            disabled
            className={inputCls + " opacity-50 cursor-not-allowed"}
          />
          <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition"
        >
          {saving ? <><Loader2 size={14} className="inline animate-spin mr-1.5" />Saving…</> : saved ? "Saved!" : "Save Changes"}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-border">
        <p className="text-sm font-medium text-foreground mb-3">Danger Zone</p>
        <button
          onClick={async () => {
            const { clearStoredAuthToken } = await import("@/lib/authToken");
            await clearStoredAuthToken();
            signOut({ callbackUrl: "/login" });
          }}
          className="px-4 py-2 rounded-xl text-sm font-medium border border-destructive/30 text-destructive hover:bg-destructive/10 transition"
        >
          Sign out
        </button>
      </div>
    </Card>
  );
}

// ─── Security Section ─────────────────────────────────────────────────────────
function SecuritySection() {
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function handleChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPass !== confirm) { setMessage({ type: "err", text: "Passwords don't match" }); return; }
    if (newPass.length < 8) { setMessage({ type: "err", text: "Password must be at least 8 characters" }); return; }
    setLoading(true);
    const res = await apiFetch("/api/user/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: newPass }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage({ type: "ok", text: "Password updated successfully" });
      setCurrent(""); setNewPass(""); setConfirm("");
    } else {
      setMessage({ type: "err", text: data.error ?? "Failed to update password" });
    }
    setLoading(false);
    setTimeout(() => setMessage(null), 4000);
  }

  return (
    <Card>
      <SectionHeader icon={Shield} title="Security" subtitle="Change your password" />
      <form onSubmit={handleChange} className="space-y-4 max-w-sm">
        {message && (
          <div className={`px-4 py-3 rounded-xl text-sm ${message.type === "ok" ? "bg-green-500/10 text-green-600 border border-green-500/20" : "bg-destructive/10 text-destructive border border-destructive/20"}`}>
            {message.text}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Current password</label>
          <div className="relative">
            <input type={showCurrent ? "text" : "password"} value={current} onChange={(e) => setCurrent(e.target.value)} required className={inputCls + " pr-11"} placeholder="••••••••" />
            <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground">
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">New password</label>
          <div className="relative">
            <input type={showNew ? "text" : "password"} value={newPass} onChange={(e) => setNewPass(e.target.value)} required minLength={8} className={inputCls + " pr-11"} placeholder="Min. 8 characters" />
            <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground">
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Confirm new password</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className={inputCls} placeholder="••••••••" />
        </div>
        <button type="submit" disabled={loading} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition">
          {loading ? <><Loader2 size={14} className="inline animate-spin mr-1.5" />Updating…</> : "Update Password"}
        </button>
      </form>
    </Card>
  );
}

// ─── Preferences Section ──────────────────────────────────────────────────────
function PreferencesSection() {
  const VOICES = ["af_bella", "af_sarah", "af_nicole", "am_adam", "am_michael", "bf_emma", "bf_isabella", "bm_george", "bm_lewis"];
  const [voice, setVoice] = useState("af_bella");
  const [speed, setSpeed] = useState(1.0);
  const [autoScroll, setAutoScroll] = useState(true);
  const [highlightWords, setHighlightWords] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    apiFetch("/api/user/preferences")
      .then((r) => r.json())
      .then((prefs) => {
        if (prefs.defaultVoice) setVoice(prefs.defaultVoice);
        if (prefs.defaultSpeed != null) setSpeed(prefs.defaultSpeed);
        if (prefs.autoScroll != null) setAutoScroll(prefs.autoScroll);
        if (prefs.highlightWords != null) setHighlightWords(prefs.highlightWords);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  async function handleSave() {
    setSaving(true);
    const res = await apiFetch("/api/user/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultVoice: voice, defaultSpeed: speed, autoScroll, highlightWords }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  if (!loaded) {
    return (
      <Card>
        <SectionHeader icon={Sliders} title="Preferences" subtitle="Default reading and playback settings" />
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <SectionHeader icon={Sliders} title="Preferences" subtitle="Default reading and playback settings" />
      <div className="space-y-6 max-w-sm">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Default voice</label>
          <select value={voice} onChange={(e) => setVoice(e.target.value)} className={inputCls}>
            {VOICES.map((v) => (
              <option key={v} value={v}>{v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-foreground">Playback speed</label>
            <span className="text-sm font-semibold text-primary">{speed.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min={0.5} max={2} step={0.1}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>0.5x</span><span>2x</span>
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t border-border">
          {[
            { label: "Auto-scroll while reading", sub: "Scroll the page to follow along with TTS", value: autoScroll, set: setAutoScroll },
            { label: "Highlight words", sub: "Highlight each word as it's spoken", value: highlightWords, set: setHighlightWords },
          ].map(({ label, sub, value, set }) => (
            <div key={label} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </div>
              <button
                onClick={() => set(!value)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${value ? "bg-primary" : "bg-muted"}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${value ? "translate-x-4" : "translate-x-1"}`} />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition"
        >
          {saving ? <><Loader2 size={14} className="inline animate-spin mr-1.5" />Saving…</> : saved ? "Saved!" : "Save Preferences"}
        </button>
      </div>
    </Card>
  );
}

// ─── Users Section (Admin only) ───────────────────────────────────────────────
interface UserRow {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  lastActiveAt: string | null;
  stats: { books: number; bookmarks: number; audiobooks: number };
}

function UsersSection() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [cName, setCName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cPassword, setCPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState("");

  const { data, isLoading, refetch } = useQuery<{ users: UserRow[] }>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await apiFetch("/api/admin/users");
      if (!res.ok) throw new Error("Forbidden");
      return res.json();
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateErr("");
    if (!cEmail || !cPassword) { setCreateErr("Email and password are required"); return; }
    if (cPassword.length < 8) { setCreateErr("Password must be at least 8 characters"); return; }
    setCreating(true);
    const res = await apiFetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: cName || undefined, email: cEmail, password: cPassword }),
    });
    const data = await res.json();
    if (!res.ok) { setCreateErr(data.error ?? "Failed to create user"); setCreating(false); return; }
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    setCreateOpen(false);
    setCName(""); setCEmail(""); setCPassword("");
    setCreating(false);
  }

  const users = data?.users ?? [];

  return (
    <>
      {/* Create User Modal */}
      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setCreateOpen(false); }}
        >
          <div className="rounded-2xl border border-border bg-card p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-foreground">Create New User</h3>
              <button onClick={() => setCreateOpen(false)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              {createErr && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3 text-sm">{createErr}</div>
              )}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Full name (optional)</label>
                <input value={cName} onChange={(e) => setCName(e.target.value)} className={inputCls} placeholder="Jane Doe" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Email *</label>
                <input type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} required className={inputCls} placeholder="user@example.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Password *</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={cPassword}
                    onChange={(e) => setCPassword(e.target.value)}
                    required
                    minLength={8}
                    className={inputCls + " pr-11"}
                    placeholder="Minimum 8 characters"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-muted transition">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="px-5 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition">
                  {creating ? <><Loader2 size={14} className="inline animate-spin mr-1.5" />Creating…</> : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Card>
        <div className="flex items-center justify-between mb-6">
          <SectionHeader icon={Users} title="Users" subtitle={`${users.length} account${users.length !== 1 ? "s" : ""}`} />
          <div className="flex items-center gap-2 -mt-6">
            <button onClick={() => refetch()} className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition">
              <RefreshCw size={15} />
            </button>
            <button onClick={() => setCreateOpen(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition">
              <Plus size={15} />
              New User
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No users yet</div>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <div key={user.id} className="flex items-start gap-4 p-4 rounded-xl border border-border bg-background hover:bg-muted/50 transition group">
                {/* Avatar */}
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-primary font-bold text-sm">
                    {(user.name ?? user.email)[0].toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{user.name ?? "—"}</p>
                    {user.email === ADMIN_EMAIL && (
                      <span className="shrink-0 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wide">Admin</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mt-2">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <BookOpen size={11} /> {user.stats.books} book{user.stats.books !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Headphones size={11} /> {user.stats.audiobooks} audiobook{user.stats.audiobooks !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Bookmark size={11} /> {user.stats.bookmarks} bookmark{user.stats.bookmarks !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 mt-1">
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Calendar size={10} /> Joined {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    {user.lastActiveAt && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <BarChart2 size={10} /> Active {new Date(user.lastActiveAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete (not own account) */}
                {user.email !== ADMIN_EMAIL && (
                  <button
                    onClick={() => {
                      if (confirm(`Delete ${user.email}? This removes all their books and data permanently.`)) {
                        deleteUser.mutate(user.id);
                      }
                    }}
                    className="shrink-0 p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

// ─── Storage Section (mobile only) ───────────────────────────────────────────
function StorageSection() {
  type Row = { bookId: string; fileType: string; size: number; downloadedAt: string; title?: string };
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    const entries = await listOfflineBooks();
    const bytes = await totalOfflineBytes();
    const withTitles: Row[] = await Promise.all(
      entries.map(async (e) => {
        try {
          const r = await apiFetch(`/api/library/${e.bookId}`);
          if (r.ok) {
            const b = (await r.json()) as { title?: string };
            return { ...e, title: b.title };
          }
        } catch { /* ignore */ }
        return e;
      })
    );
    setRows(withTitles);
    setTotal(bytes);
    setLoading(false);
  }

  useEffect(() => { refresh().catch(() => setLoading(false)); }, []);

  async function remove(bookId: string) {
    setBusy(bookId);
    try { await deleteOfflineBook(bookId); await refresh(); }
    finally { setBusy(null); }
  }

  async function clearAll() {
    if (!confirm("Remove every offline book from this device?")) return;
    for (const r of rows) {
      try { await deleteOfflineBook(r.bookId); } catch { /* ignore */ }
    }
    await refresh();
  }

  return (
    <Card>
      <SectionHeader icon={HardDrive} title="Storage" subtitle="Books downloaded to this device" />

      <div className="mb-6 flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
        <div>
          <p className="text-xs text-muted-foreground">Used by offline books</p>
          <p className="text-lg font-semibold text-foreground">{formatBytes(total)}</p>
        </div>
        {rows.length > 0 && (
          <button
            onClick={clearAll}
            className="px-3 py-2 text-xs font-semibold rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition"
          >
            Free up space
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          <Loader2 size={16} className="inline animate-spin mr-2" />Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="py-8 text-center">
          <Download size={22} className="mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nothing downloaded yet. Long-press a book in the library to save it for offline.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {rows.map((r) => (
            <div key={r.bookId} className="flex items-center gap-3 py-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-[10px] uppercase font-bold">
                {r.fileType}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{r.title ?? r.bookId}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(r.size)} · downloaded {new Date(r.downloadedAt).toLocaleDateString()}
                </p>
              </div>
              <button
                disabled={busy === r.bookId}
                onClick={() => remove(r.bookId)}
                className="p-2 rounded-lg text-destructive hover:bg-destructive/10 disabled:opacity-50 transition"
                aria-label="Remove from device"
              >
                {busy === r.bookId ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user: currentUser } = useCurrentUser();
  const [active, setActive] = useState<Section>("profile");
  const [showStorage, setShowStorage] = useState(false);
  const isAdmin = currentUser?.email === ADMIN_EMAIL;

  useEffect(() => { setShowStorage(isNative()); }, []);

  const allNav = [
    ...NAV,
    ...(showStorage ? [STORAGE_NAV] : []),
    ...(isAdmin ? ADMIN_NAV : []),
  ];

  const content: Record<Section, React.ReactNode> = {
    profile: <ProfileSection />,
    security: <SecuritySection />,
    preferences: <PreferencesSection />,
    storage: <StorageSection />,
    users: <UsersSection />,
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      {/* Nav tabs (horizontal scroll on mobile) */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-6 scrollbar-hide">
        {allNav.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition ${
              active === key
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {content[active]}
    </div>
  );
}
