import Link from "next/link";

export function MainMenu() {
  return (
    <div className="nl-hero-copy">
      <p className="nl-kicker">Solara Tower</p>
      <h1>
        Solara,
        <br />
        and the first block.
      </h1>
      <p className="nl-lede">
        Walk the streets around the tower. Solara stays the landmark. Caliza, Vanta, and Cayo are the first three neighbors.
      </p>
      <div className="nl-hero-actions">
        <Link className="nl-button" href="/game">
          Enter the site
        </Link>
        <Link className="nl-button nl-button-ghost" href="/settings">
          Settings
        </Link>
      </div>
    </div>
  );
}
