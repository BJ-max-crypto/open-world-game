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
        Walk the downtown streets around Solara Tower. Caliza, Vanta, and Cayo stay as they were. Lumen, Brisa, Mercado, and Nave sit on the next blocks.
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
