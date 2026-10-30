import CoatingScene from "@/components/sections/CoatingScene";
import Footer from "@/components/sections/Footer";
import MacroReveal from "@/components/sections/MacroReveal";
import Payoff from "@/components/sections/Payoff";
import Proof from "@/components/sections/Proof";
import WashScene from "@/components/sections/WashScene";

export default function Home() {
  return (
    <>
      <main id="main" className="relative">
        {/* Sunshine payoff opens the page with the brand statement (h1).
            The Hero section was removed and deleted by user request
            (finalize pass). */}
        <Payoff />
        <WashScene />
        <MacroReveal />
        <CoatingScene />
        <Proof />
      </main>
      <Footer />
    </>
  );
}
