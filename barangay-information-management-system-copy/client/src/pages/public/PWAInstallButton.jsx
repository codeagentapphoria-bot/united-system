import { useState, useEffect } from "react";
import { Download, X, Smartphone, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(true);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    } else {
      setIsInstalled(false);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  if (!isVisible || isInstalled) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 rounded-2xl p-1 shadow-2xl border border-blue-500/30 backdrop-blur-xl">
        <div className="bg-gradient-to-br from-blue-600/20 to-sky-500/20 rounded-xl p-4 sm:p-5">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex-shrink-0">
              <div className="relative">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-sky-400 rounded-xl flex items-center justify-center shadow-lg">
                  <Smartphone className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-slate-900">
                  <Monitor className="w-3 h-3 text-white" />
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-white font-bold text-sm sm:text-base mb-1">
                Install App
              </h3>
              <p className="text-blue-200 text-xs sm:text-sm leading-relaxed">
                Add to your home screen for a better experience
              </p>

              <div className="flex items-center gap-2 mt-3">
                <Button
                  onClick={handleInstall}
                  size="sm"
                  className="bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 text-white font-semibold shadow-lg transition-all duration-200 hover:scale-105"
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  Install
                </Button>
                <Button
                  onClick={handleDismiss}
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-blue-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
