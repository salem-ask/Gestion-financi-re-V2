import { HashRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { AuthProvider } from "@/hooks/AuthContext";
import { AuthGate } from "@/components/auth/AuthGate";
import { HomePage } from "@/pages/HomePage";
import { DailyPage } from "@/pages/DailyPage";
import { WeeklyPage } from "@/pages/WeeklyPage";
import { MonthlyPage } from "@/pages/MonthlyPage";
import { YearlyPage } from "@/pages/YearlyPage";
import { NotesPage } from "@/pages/NotesPage";
import { SearchPage } from "@/pages/SearchPage";
import { TrashPage } from "@/pages/TrashPage";
import { AccountPage } from "@/pages/AccountPage";
import { SettingsPage } from "@/pages/SettingsPage";

/**
 * HashRouter est utilise volontairement : il fonctionne sans aucune
 * configuration de reecriture d'URL cote serveur, ce qui garantit un
 * comportement identique sur GitHub Pages, Netlify et Cloudflare Pages
 * des le premier deploiement.
 *
 * AuthProvider (authentification Supabase) entoure toujours toute l'app et
 * continue de tourner immediatement, comme avant. AuthGate, lui, bloque
 * reellement le montage de HashRouter/AppShell/Routes tant qu'aucune
 * session valide n'existe : aucune page (donc aucune lecture IndexedDB de
 * page) ne peut s'executer avant authentification -- voir AuthGate pour le
 * detail des etats (non configure / chargement / non connecte / connecte).
 */
export function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <HashRouter>
          <AppShell>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/quotidien" element={<DailyPage />} />
              <Route path="/hebdomadaire" element={<WeeklyPage />} />
              <Route path="/mensuel" element={<MonthlyPage />} />
              <Route path="/annuel" element={<YearlyPage />} />
              <Route path="/notes" element={<NotesPage />} />
              <Route path="/recherche" element={<SearchPage />} />
              <Route path="/corbeille" element={<TrashPage />} />
              <Route path="/compte" element={<AccountPage />} />
              <Route path="/parametres" element={<SettingsPage />} />
            </Routes>
          </AppShell>
        </HashRouter>
      </AuthGate>
    </AuthProvider>
  );
}
