import { MainMenu } from "@/components/Menus/MainMenu";

export default function HomePage() {
  return (
    <main className="nl-home">
      <div className="nl-sky" />
      <header className="nl-topbar">
        <span>Northline</span>
        <span>Harbor night</span>
      </header>
      <MainMenu />
      <p className="nl-footer-note">WASD to walk · mouse to look · F for the cab · E at a door</p>
      <div className="nl-skyline" aria-hidden>
        <i style={{ height: "42%" }} />
        <i style={{ height: "68%" }} />
        <i style={{ height: "36%" }} />
        <i style={{ height: "80%" }} />
        <i style={{ height: "28%" }} />
        <i style={{ height: "58%" }} />
        <i style={{ height: "74%" }} />
        <i style={{ height: "33%" }} />
        <i style={{ height: "62%" }} />
        <i style={{ height: "48%" }} />
      </div>
    </main>
  );
}
