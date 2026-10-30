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
        {/* Hero wash opens the page (the h1 lives there, sr-only). The
            sunlight payoff statement + booking CTA follows, then the macro
            story and the coating seal (user-requested order, final polish
            pass). */}
        <WashScene />
        <Payoff />
        <MacroReveal />
        <CoatingScene />
        <Proof />
      </main>
      <Footer />
    </>
  );
}
