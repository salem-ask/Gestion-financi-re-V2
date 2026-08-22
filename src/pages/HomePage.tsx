import { SummaryCard } from "@/components/ui/SummaryCard";
import { useSummary } from "@/hooks/useSummary";
import "./HomePage.css";

export function HomePage() {
  const { summary } = useSummary();

  return (
    <div className="home-page">
      <p className="home-page__intro">
        Vue d'ensemble de vos finances. Les montants s'afficheront ici des que vous
        commencerez a saisir vos operations.
      </p>
      <div className="home-page__grid">
        <SummaryCard titre="Aujourd'hui" data={summary.aujourdHui} />
        <SummaryCard titre="Cette semaine" data={summary.cetteSemaine} />
        <SummaryCard titre="Ce mois" data={summary.ceMois} />
        <SummaryCard titre="Cette annee" data={summary.cetteAnnee} />
      </div>
    </div>
  );
}
