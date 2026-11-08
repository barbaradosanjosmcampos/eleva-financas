import { useEffect, useRef, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { Modal } from "./ui";

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
const isInstalled = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export default function PwaControls() {
  const [installed, setInstalled] = useState(isInstalled);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [help, setHelp] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [message, setMessage] = useState("");
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [confirmUpdate, setConfirmUpdate] = useState(false);
  const [updating, setUpdating] = useState(false);
  const reloadRequested = useRef(false);
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  useEffect(() => {
    const capture = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
    };
    const complete = () => {
      setInstalled(true);
      setInstallEvent(null);
      setHelp(false);
      setMessage("ELEVA instalado neste dispositivo.");
    };
    const display = window.matchMedia("(display-mode: standalone)");
    const displayChanged = () => setInstalled(isInstalled());
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", complete);
    display.addEventListener("change", displayChanged);
    return () => {
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", complete);
      display.removeEventListener("change", displayChanged);
    };
  }, []);

  useEffect(() => {
    // Production only: a development worker could cache source edits.
    if (!import.meta.env.PROD || !window.isSecureContext || !("serviceWorker" in navigator)) return;
    let disposed = false;
    let registration: ServiceWorkerRegistration | undefined;
    const cleanups: (() => void)[] = [];
    const listen = (target: EventTarget, name: string, handler: EventListener) => {
      target.addEventListener(name, handler);
      cleanups.push(() => target.removeEventListener(name, handler));
    };
    const controllerChanged = () => {
      if (reloadRequested.current) window.location.reload();
      else setWaiting(null);
    };
    listen(navigator.serviceWorker, "controllerchange", controllerChanged);
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).then(reg => {
      if (disposed) return;
      registration = reg;
      const offer = () => {
        if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
      };
      const observe = () => {
        const worker = reg.installing;
        if (worker) listen(worker, "statechange", offer);
      };
      offer();
      observe();
      listen(reg, "updatefound", observe);
    }).catch(() => {
      // Finance features remain available if registration/network is unavailable.
    });
    const check = () => {
      if (document.visibilityState === "visible") void registration?.update().catch(() => {});
    };
    listen(document, "visibilitychange", check);
    listen(window, "online", check);
    const interval = window.setInterval(check, 60 * 60 * 1000);
    return () => {
      disposed = true;
      cleanups.forEach(cleanup => cleanup());
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!updating) return;
    const timeout = window.setTimeout(() => {
      reloadRequested.current = false;
      setUpdating(false);
      setMessage("Não foi possível concluir a atualização. Tente novamente quando houver conexão.");
    }, 15000);
    return () => window.clearTimeout(timeout);
  }, [updating]);

  const install = async () => {
    if (!installEvent) { setHelp(true); return; }
    setInstalling(true);
    setMessage("");
    setInstallEvent(null); // Browser prompts can only be used once.
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      setMessage(choice.outcome === "accepted"
        ? "Solicitação aceita. Aguarde a confirmação do navegador."
        : "Instalação cancelada. Você pode continuar usando o ELEVA no navegador.");
    } catch {
      setHelp(true);
    } finally { setInstalling(false); }
  };

  return (
    <div className="pwa-controls">
      {!installed && <button className="secondary pwa-install" onClick={install} disabled={installing}>
        <Download size={16} aria-hidden="true" />
        {installing ? "Aguardando navegador…" : "Instalar ELEVA"}
      </button>}
      {waiting && <div className="pwa-update" role="status">
        <span>Uma nova versão do ELEVA está disponível.</span>
        <button className="secondary" disabled={updating} onClick={() => setConfirmUpdate(true)}>
          <RefreshCw size={16} aria-hidden="true" /> {updating ? "Atualizando…" : "Atualizar aplicativo"}
        </button>
      </div>}
      {message && <p className="pwa-message" role="status">{message}</p>}
      {help && <Modal title="Instalar ELEVA" onClose={() => setHelp(false)}>
        <div className="pwa-help">
          {ios ? <>
            <p>No iPhone ou iPad, abra o ELEVA no Safari.</p>
            <ol><li>Toque no menu <strong>Compartilhar</strong> (quadrado com uma seta para cima).</li>
              <li>Escolha <strong>Adicionar à Tela de Início</strong>. Se necessário, procure em Mais ou Editar Ações.</li>
              <li>Se aparecer, ative <strong>Abrir como App da Web</strong> e confirme em <strong>Adicionar</strong>.</li></ol>
          </> : <>
            <p>No Android, abra o ELEVA no Chrome e use o menu de três pontos.</p>
            <ol><li>Procure <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.</li>
              <li>Confirme a opção oferecida pelo navegador.</li></ol>
            <p>No computador, procure o ícone de instalação na barra de endereço ou a opção de instalar no menu. Se a opção não aparecer, use um navegador compatível e uma conexão HTTPS.</p>
          </>}
          <p>A instalação depende do navegador. Continue por ele se a opção não estiver disponível. O ELEVA não oferece operação offline completa.</p>
          <p>Os dados ficam neste navegador e podem não aparecer no app instalado, especialmente no iPhone. Exporte um backup JSON antes de instalar ou trocar de navegador e restaure-o no app, se necessário. Instalar não faz uma cópia de segurança.</p>
          <button className="primary" onClick={() => setHelp(false)}>Entendi</button>
        </div>
      </Modal>}
      {confirmUpdate && <Modal title="Atualizar o ELEVA?" onClose={() => setConfirmUpdate(false)}>
        <div className="pwa-help">
          <p>A página será recarregada. Salve ou conclua seus formulários antes de continuar; campos ainda não salvos serão perdidos. Os registros já gravados e backups locais serão preservados.</p>
          <div className="pwa-actions">
            <button className="secondary" onClick={() => setConfirmUpdate(false)}>Agora não</button>
            <button className="primary" onClick={() => {
              if (!waiting || waiting.state === "redundant") {
                setMessage("A versão mudou em outra aba. Recarregue quando seus formulários estiverem salvos.");
                setWaiting(null);
                setConfirmUpdate(false);
                return;
              }
              reloadRequested.current = true;
              setUpdating(true);
              setConfirmUpdate(false);
              waiting.postMessage({ type: "ACTIVATE_UPDATE" });
            }}>Salvar concluído, atualizar agora</button>
          </div>
        </div>
      </Modal>}
    </div>
  );
}
