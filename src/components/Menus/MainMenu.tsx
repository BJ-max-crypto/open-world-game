import Link from "next/link";

export function MainMenu() {
  return (
    <div className="nl-hero-copy">
      <p className="nl-kicker">Solara Tower</p>
      <h1>
        One tower.
        <br />
        The whole site.
      </h1>
      <p className="nl-lede">
        Walk the plaza and look up. Solara is a 180 meter residential tower, and the rest of the coast is cleared while it is under review.
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
