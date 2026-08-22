import { HashRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { AuthProvider } from "@/hooks/AuthContext";
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
 * AuthProvider (authentification Supabase, PHASE 2 de la synchronisation)
 * entoure toute l'app mais reste independant de storageService/IndexedDB :
 * aucune page existante n'en depend, seule /compte l'utilise pour l'instant.
 */
export function App() {
  return (
    <AuthProvider>
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
    </AuthProvider>
  );
}
