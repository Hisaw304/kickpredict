// import "./pageHero.css";

export default function PageHero({ bgImage, line1, line2, line3 }) {
  return (
    <section
      className="page-hero"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="page-hero-overlay">
        <div className="max-w-7xl mx-auto px-6 py-32">
          <h1 className="page-hero-heading">
            <span>{line1}</span>
            <span>{line2}</span>
            <span>{line3}</span>
          </h1>
        </div>
      </div>
    </section>
  );
}
