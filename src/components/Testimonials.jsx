import { useEffect, useState } from "react";
import { Star, ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";

const testimonials = [
  {
    name: "Berthold Otto",
    country: "Germany 🇩🇪",
    text: "KickPredict has completely changed how I follow football matches. Before discovering the platform, I used to spend hours checking different sources and trying to make sense of team form on my own. Now everything feels much more structured and reliable. The predictions are clear, easy to follow, and surprisingly consistent over time. It has genuinely become one of the few football platforms I trust daily.",
  },
  {
    name: "James Lori",
    country: "United Kingdom 🇬🇧",
    text: "Very reliable predictions and a genuinely smooth experience overall. What stood out to me first was how simple and professional the platform looked, but after using it for a while, I realized the real strength is in the consistency of the picks. I now check KickPredict every single day before matches because it saves me time and gives me a much better starting point when making decisions.",
  },
  {
    name: "Alfredo Ramirez",
    country: "Spain 🇪🇸",
    text: "Clean interface, strong football analysis, and predictions that actually feel well thought out. I’ve tried several similar platforms in the past, but many of them felt rushed or too generic. KickPredict feels different because the selections seem more deliberate and grounded in proper match understanding. It’s one of the best prediction websites I’ve come across in a long time.",
  },
  {
    name: "Ashley Kate",
    country: "USA 🇺🇸",
    text: "I love how simple, accurate, and organized everything is. Even as someone who doesn’t want to spend too much time digging through football stats, I still feel like I’m getting useful and high-quality insights here. The platform is easy to navigate, the predictions are presented clearly, and the overall experience feels premium. I’ve already recommended it to a few friends who enjoy football too.",
  },
  {
    name: "Denis Dubois",
    country: "France 🇫🇷",
    text: "What impressed me most about KickPredict is the consistency. It’s easy for any site to get a few predictions right, but maintaining a strong level of quality over time is what really matters. I’ve been following the platform for a while now, and I appreciate how dependable and straightforward it has been. It feels like a serious football prediction platform rather than just another flashy website.",
  },
  {
    name: "Ahmed Hassan",
    country: "Egypt 🇪🇬",
    text: "Professional platform with excellent football prediction quality. From the first time I used it, I could tell that a lot of attention had gone into both the design and the actual match selections. The site feels trustworthy, clean, and easy to use, and the predictions themselves are much stronger than what I’ve seen on many competing platforms. It has become part of my regular football routine.",
  },
  {
    name: "Andrea Lucas",
    country: "Italy 🇮🇹",
    text: "Very consistent predictions and a great user experience from start to finish. I’ve been using KickPredict for months now, and one of the main reasons I keep coming back is because it feels dependable. The match selections are easy to understand, the platform doesn’t feel cluttered, and the overall presentation is very polished. The results have been strong enough to make it one of my go-to football resources.",
  },
  {
    name: "Daniel Svensson",
    country: "Sweden 🇸🇪",
    text: "Simple, clean, and accurate — exactly what I was looking for in a football prediction platform. A lot of websites in this space are overloaded with unnecessary information, but KickPredict keeps things clear while still feeling detailed and useful. I appreciate how easy it is to find what I need without distractions. It gives me confidence every time I check the daily predictions.",
  },
  {
    name: "Lourenço Silva",
    country: "Portugal 🇵🇹",
    text: "Great experience so far, and definitely one of the more trustworthy football platforms I’ve used. What I appreciate most is that the predictions don’t feel random or careless — they feel backed by proper thought and match understanding. It has also helped me look at fixtures differently and understand games more clearly. The whole platform feels polished and well put together.",
  },
  {
    name: "David Kim",
    country: "South Korea 🇰🇷",
    text: "Professional platform with impressive consistency and very clean presentation. I check the predictions daily now because they’ve become a useful part of how I prepare before matches. The platform is easy to use, visually appealing, and most importantly, it gives me football insights that actually feel dependable. It’s one of the few sites I’ve continued using without losing confidence in it.",
  },
  {
    name: "Josh Pereira",
    country: "Brazil 🇧🇷",
    text: "One of the best prediction websites I’ve used in recent years. The site feels modern and easy to navigate, but beyond that, the quality of the football picks is what really makes it stand out. I like that the platform feels focused and not overly complicated. It’s straightforward, reliable, and clearly built for people who genuinely follow football and want smarter predictions.",
  },
  {
    name: "Jeffrey Noah",
    country: "Netherlands 🇳🇱",
    text: "The data behind the predictions feels well analyzed and not just randomly selected. That’s something I noticed almost immediately after using KickPredict for a short time. It gives the impression that real thought goes into the selections, and that builds trust. The platform itself is also very polished, which makes the full experience feel much more professional than many alternatives online.",
  },
  {
    name: "Ali Khan",
    country: "Pakistan 🇵🇰",
    text: "Excellent platform with a level of consistency that’s hard to find elsewhere. I’ve tested quite a few prediction sites over time, and most of them either feel unreliable or poorly organized. KickPredict stands out because it feels both accurate and professionally built. The football tips are easy to understand, and the platform itself makes daily use very smooth and enjoyable.",
  },
  {
    name: "Ethan Bowman",
    country: "Australia 🇦🇺",
    text: "Clean design, strong football predictions, and an overall experience that feels genuinely premium. I like how the site balances simplicity with quality. It doesn’t overwhelm you, but it still gives you enough confidence in the selections. I’ve been impressed not just by the predictions themselves, but by how polished and trustworthy the platform feels every time I use it.",
  },
  {
    name: "Igor Lev",
    country: "Russia 🇷🇺",
    text: "Very detailed and reliable predictions with a level of consistency that makes the platform stand out. I’ve been following football for years and have used many different websites for match insight, but KickPredict feels much more refined than most. The interface is clean, the daily picks are easy to review, and the overall quality has been strong enough to keep me coming back regularly.",
  },
  {
    name: "Adeyemo Tony",
    country: "Nigeria 🇳🇬",
    text: "KickPredict has honestly become part of my daily football routine. Every morning I check the platform because it has proven to be one of the most dependable places for match predictions. I like how straightforward and organized everything is, and the overall quality feels much higher than many similar sites. It saves me time, builds confidence, and adds real value to how I follow football.",
  },
];

export default function Testimonials() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActive((prev) => (prev + 1) % testimonials.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const prevSlide = () => {
    setActive((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const nextSlide = () => {
    setActive((prev) => (prev + 1) % testimonials.length);
  };

  const getCardClass = (index) => {
    const diff = (index - active + testimonials.length) % testimonials.length;

    if (diff === 0) return "kp-testimonial-card active";
    if (diff === 1) return "kp-testimonial-card next";
    if (diff === testimonials.length - 1) return "kp-testimonial-card prev";
    if (diff === 2) return "kp-testimonial-card next-far";
    if (diff === testimonials.length - 2) return "kp-testimonial-card prev-far";
    return "kp-testimonial-card hidden-card";
  };

  return (
    <section className="kp-testimonials">
      <div className="kp-testimonials-container">
        <h2 className="kp-testimonials-title">
          What Users Say About KickPredict Football Predictions
        </h2>

        <p className="kp-testimonials-sub">
          Read real feedback from football fans and prediction users who rely on
          KickPredict for daily match tips, consistent football insights, and
          trusted betting analysis.
        </p>

        <div className="kp-testimonials-slider">
          {testimonials.map((item, index) => (
            <div key={index} className={getCardClass(index)}>
              <div className="kp-stars">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={18} fill="currentColor" />
                ))}
              </div>

              <div className="kp-verified">
                <CheckCircle size={16} />
                <span>Verified Review</span>
              </div>

              <p className="kp-review-text">{item.text}</p>

              <div className="kp-user">
                <div className="kp-avatar">
                  {item.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>

                <div>
                  <strong>{item.name}</strong>
                  <span>{item.country}</span>
                </div>
              </div>

              <div className="kp-quote-mark">”</div>
            </div>
          ))}
        </div>

        <div className="kp-testimonial-controls">
          <button onClick={prevSlide} aria-label="Previous testimonial">
            <ChevronLeft size={20} />
          </button>
          <button onClick={nextSlide} aria-label="Next testimonial">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </section>
  );
}
