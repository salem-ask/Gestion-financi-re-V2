import { HashRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { HomePage } from "@/pages/HomePage";
import { DailyPage } from "@/pages/DailyPage";
import { WeeklyPage } from "@/pages/WeeklyPage";
import { MonthlyPage } from "@/pages/MonthlyPage";
import { YearlyPage } from "@/pages/YearlyPage";
import { NotesPage } from "@/pages/NotesPage";
import { SearchPage } from "@/pages/SearchPage";

/**
 * HashRouter est utilise volontairement : il fonctionne sans aucune
 * configuration de reecriture d'URL cote serveur, ce qui garantit un
 * comportement identique sur GitHub Pages, Netlify et Cloudflare Pages
 * des le premier deploiement.
 */
export function App() {
  return (
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
        </Routes>
      </AppShell>
    </HashRouter>
  );
}
