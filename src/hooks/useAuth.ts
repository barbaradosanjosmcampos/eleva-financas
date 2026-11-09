import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const [recovery, setRecovery] = useState(false);
  const [notice, setNotice] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    let observed = false;
    const callback = new URLSearchParams(location.search).has("code");
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      observed = true;
      if (!active) return;
      setSession(next);
      setLoading(false);
      if (event === "INITIAL_SESSION" && callback && !next) {
        setNotice(
          "O link de autenticação é inválido ou expirou. Solicite um novo link.",
        );
        history.replaceState(null, "", location.pathname);
      }
      if (
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "PASSWORD_RECOVERY"
      )
        setNotice("");
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (event === "SIGNED_OUT") {
        setRecovery(false);
        setNotice(
          "Sessão encerrada ou expirada. Entre novamente para acessar sua carteira sincronizada.",
        );
      }
    });
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active || observed) return;
        setSession(data.session);
        setLoading(false);
        if (error)
          setNotice("Não foi possível recuperar a sessão. Entre novamente.");
      })
      .catch(() => {
        if (active) {
          setLoading(false);
          setNotice("Não foi possível recuperar a sessão.");
        }
      });
    // Supabase removes callback credentials; remove remaining error descriptions too.
    const query = new URLSearchParams(location.search);
    if (query.has("error") || location.hash.includes("error_description=")) {
      setNotice(
        "O link de autenticação é inválido ou expirou. Solicite um novo link.",
      );
      history.replaceState(null, "", location.pathname);
    }
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!session?.expires_at) return;
    const remaining = session.expires_at * 1000 - Date.now();
    const expire = () => {
      setSession(null);
      setRecovery(false);
      setNotice(
        "Sessão expirada. Entre novamente para acessar sua carteira sincronizada.",
      );
    };
    if (remaining <= 0) {
      expire();
      return;
    }
    const timer = window.setTimeout(expire, Math.min(remaining, 2147483647));
    return () => clearTimeout(timer);
  }, [session]);
  async function logout() {
    if (!supabase || loggingOut) return;
    setLoggingOut(true);
    try {
      // Local scope clears this browser; other devices keep their sessions.
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw error;
      setSession(null);
      setRecovery(false);
    } catch {
      setNotice("Não foi possível sair. Tente novamente.");
    } finally {
      setLoggingOut(false);
    }
  }
  return {
    session,
    loading,
    recovery,
    setRecovery,
    notice,
    logout,
    loggingOut,
  };
}
