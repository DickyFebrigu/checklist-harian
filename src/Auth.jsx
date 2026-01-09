function AuthCard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login"); // login | register

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    const action =
      mode === "login"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });

    const { error } = await action;

    if (error) alert(error.message);
    else if (mode === "register") {
      alert("Registrasi berhasil. Kalau diminta verifikasi email, cek inbox/spam ya.");
    }

    setLoading(false);
  }

  return (
    <div className="authPage">
      <div className="authCardNew">
        <div className="authHeaderNew">
          <div className="authLogoNew">✓</div>
          <div>
            <div className="authTitleNew">App Pencatatan Harian Fauziyah</div>
            <div className="authSubNew">Data kamu akan tersimpan & sinkron otomatis setelah login.</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="authFormNew">
          <label className="authLabelNew">Email</label>
          <input
            className="authInputNew"
            type="email"
            placeholder="nama@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label className="authLabelNew">Password</label>
          <input
            className="authInputNew"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button className="authBtnNew" disabled={loading}>
            {loading ? "..." : mode === "login" ? "Masuk" : "Daftar"}
          </button>

          <div className="authFooterNew">
            {mode === "login" ? (
              <div>
                Belum punya akun?{" "}
                <button
                  type="button"
                  className="authLinkNew"
                  onClick={() => setMode("register")}
                  disabled={loading}
                >
                  Daftar
                </button>
              </div>
            ) : (
              <div>
                Sudah punya akun?{" "}
                <button
                  type="button"
                  className="authLinkNew"
                  onClick={() => setMode("login")}
                  disabled={loading}
                >
                  Login
                </button>
              </div>
            )}

            <div className="authHintNew">Tip: kalau diminta verifikasi email, cek inbox / spam.</div>
          </div>
        </form>
      </div>
    </div>
  );
}
