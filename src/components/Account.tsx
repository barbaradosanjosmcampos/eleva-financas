import { useState } from "react";
import { supabase, configurationError, authRedirect } from "../lib/supabase";
import { Field } from "./ui";
type Screen = "login" | "signup" | "forgot" | "confirm" | "reset";
export default function Account({
  recovery,
  onRecovered,
  notice,
  premium = false,
}: {
  recovery: boolean;
  onRecovered: () => void;
  notice: string;
  premium?: boolean;
}) {
  const [screen, setScreen] = useState<Screen>(recovery ? "reset" : "login");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const active = recovery ? "reset" : screen;
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase || busy) return;
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (active === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else if (active === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: authRedirect() },
        });
        if (error) throw error;
        setScreen("confirm");
        setMessage(
          "Se o cadastro estiver disponível, você receberá um e-mail. Confirme o endereço pelo link para continuar.",
        );
      } else if (active === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: authRedirect(),
        });
        if (error) throw error;
        setMessage(
          "Se houver uma conta com este endereço, enviaremos as instruções de recuperação.",
        );
      } else if (active === "confirm") {
        const { error } = await supabase.auth.resend({
          type: "signup",
          email,
          options: { emailRedirectTo: authRedirect() },
        });
        if (error) throw error;
        setMessage(
          "Se aplicável, um novo link será enviado. Verifique também o spam.",
        );
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        // End recovery session and require a fresh password login.
        const { error: signOutError } = await supabase.auth.signOut({
          scope: "local",
        });
        if (signOutError) throw signOutError;
        onRecovered();
        setScreen("login");
        setMessage("Senha atualizada. Entre com sua nova senha.");
      }
    } catch {
      setError(
        active === "login"
          ? "Não foi possível entrar. Confira e-mail, senha e a confirmação do endereço."
          : "Não foi possível concluir. O link pode ter expirado ou o limite de tentativas foi atingido. Tente novamente mais tarde.",
      );
    } finally {
      setBusy(false);
    }
  }
  const titles = {
    login: "Entre no seu espaço",
    signup: "Crie sua conta ELEVA",
    forgot: "Recupere sua senha",
    confirm: "Confirme seu e-mail",
    reset: "Escolha uma nova senha",
  };
  return (
    <section className="panel account-panel" aria-label="Acesso à conta">
      <div className="eyebrow">{premium ? "ELEVA · SIMULADOR PREMIUM" : "ELEVA · SUA CARTEIRA SINCRONIZADA"}</div>
      <h2>{titles[active]}</h2>
      <p>
        {premium
          ? "Use o mesmo e-mail da sua compra na Kiwify."
          : "Uma conta individual para organizar suas conquistas. A demonstração continua disponível sem login."}
      </p>
      {notice && <p role="status">{notice}</p>}
      {!supabase && (
        <p role="alert">
          {configurationError ||
            (premium ? "O acesso ao simulador ainda não está configurado." : "A sincronização ainda não foi configurada. A carteira local e a demonstração continuam disponíveis.")}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <form onSubmit={submit}>
        <fieldset disabled={busy || !supabase}>
          {active !== "reset" && (
            <Field label="E-mail">
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                maxLength={254}
              />
            </Field>
          )}
          {["login", "signup", "reset"].includes(active) && (
            <Field label={active === "reset" ? "Nova senha" : "Senha"}>
              <input
                type="password"
                name="password"
                autoComplete={
                  active === "login" ? "current-password" : "new-password"
                }
                minLength={active === "login" ? 1 : 12}
                maxLength={128}
                required
              />
            </Field>
          )}
          {["signup", "reset"].includes(active) && (
            <p>Use pelo menos 12 caracteres e uma senha exclusiva.</p>
          )}
          <button className="primary" type="submit">
            {busy
              ? "Aguarde…"
              : {
                  login: "Entrar",
                  signup: "Criar conta",
                  forgot: "Enviar recuperação",
                  confirm: "Reenviar confirmação",
                  reset: "Salvar nova senha",
                }[active]}
          </button>
        </fieldset>
      </form>
      {!recovery && (
        <nav className="account-links" aria-label="Opções da conta">
          {(
            [
              ["login", "Já tenho conta"],
              ["signup", "Criar conta"],
              ["forgot", "Esqueci minha senha"],
              ["confirm", "Confirmar e-mail"],
            ] as const
          )
            .filter(([s]) => s !== active)
            .map(([s, label]) => (
              <button
                disabled={busy}
                className="text-button"
                key={s}
                onClick={() => {
                  setScreen(s);
                  setError("");
                  setMessage("");
                }}
              >
                {label}
              </button>
            ))}
        </nav>
      )}
    </section>
  );
}
