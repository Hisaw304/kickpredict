import { Star, CheckCircle } from "lucide-react";

const testimonials = [
  {
    name: "Berthold Otto",
    country: "Germany 🇩🇪",
    text: "KickPredict has completely changed how I follow matches. The accuracy is impressive.",
  },
  {
    name: "James Lori",
    country: "United Kingdom 🇬🇧",
    text: "Very reliable predictions. I check this site every day before games.",
  },
  {
    name: "Alfredo Ramirez",
    country: "Spain 🇪🇸",
    text: "Clean interface and strong predictions. One of the best platforms out there.",
  },
  {
    name: "Ashley Kate",
    country: "USA 🇺🇸",
    text: "I love how simple and accurate everything is. Highly recommended.",
  },
  {
    name: "Denis Dubois",
    country: "France 🇫🇷",
    text: "Great insights and very consistent results over time.",
  },
  {
    name: "Ahmed Hassan",
    country: "Egypt 🇪🇬",
    text: "Professional platform with excellent prediction accuracy.",
  },

  {
    name: "Andrea Lucas",
    country: "Italy 🇮🇹",
    text: "Very consistent predictions. I’ve been using KickPredict for months and the results speak for themselves.",
  },
  {
    name: "Daniel Svensson",
    country: "Sweden 🇸🇪",
    text: "Simple, clean, and accurate. Exactly what I was looking for in a prediction platform.",
  },
  {
    name: "Lourenço Silva",
    country: "Portugal 🇵🇹",
    text: "Great experience so far. The insights really help me understand matches better.",
  },
  {
    name: "David Kim",
    country: "South Korea 🇰🇷",
    text: "Professional platform with impressive accuracy. I check predictions daily.",
  },
  {
    name: "Josh Pereira",
    country: "Brazil 🇧🇷",
    text: "One of the best prediction sites I’ve used. Very reliable and easy to follow.",
  },
  {
    name: "Jeffrey Noah",
    country: "Netherlands 🇳🇱",
    text: "The data behind the predictions is clearly well analyzed. Highly trustworthy.",
  },
  {
    name: "Ali Khan",
    country: "Pakistan 🇵🇰",
    text: "Excellent platform. The accuracy rate is better than most sites I’ve tried.",
  },
  {
    name: "Ethan Bowman",
    country: "Australia 🇦🇺",
    text: "Clean design and strong predictions. I recommend it to my friends.",
  },
  {
    name: "Igor Lev",
    country: "Russia 🇷🇺",
    text: "Very detailed and reliable predictions. Great job by the team.",
  },
  {
    name: "Adeyemo Tony",
    country: "Nigeria 🇳🇬",
    text: "KickPredict has become part of my daily routine. Very consistent results.",
  },
];

export default function Testimonials() {
  return (
    <section className="kp-testimonials">
      <div className="kp-testimonials-container">
        <h2 className="kp-testimonials-title">What Our Users Say</h2>

        <p className="kp-testimonials-sub">
          Trusted by thousands of users worldwide, KickPredict delivers
          consistent and reliable football predictions every day.
        </p>

        {/* TOP SCROLL */}
        <div className="kp-scroll-row">
          <div className="kp-scroll-track">
            {[...testimonials, ...testimonials].map((item, i) => (
              <div className="kp-testimonial-card" key={i}>
                <div className="kp-stars">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} />
                  ))}
                </div>

                <div className="kp-verified">
                  <CheckCircle size={16} />
                  <span>Verified Review</span>
                </div>

                <p className="kp-review-text">{item.text}</p>

                <div className="kp-user">
                  <strong>{item.name}</strong>
                  <span>{item.country}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM SCROLL */}
        <div className="kp-scroll-row slow">
          <div className="kp-scroll-track">
            {[...testimonials, ...testimonials].map((item, i) => (
              <div className="kp-testimonial-card" key={i}>
                <div className="kp-stars">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} />
                  ))}
                </div>

                <div className="kp-verified">
                  <CheckCircle size={16} />
                  <span>Verified Review</span>
                </div>

                <p className="kp-review-text">{item.text}</p>

                <div className="kp-user">
                  <strong>{item.name}</strong>
                  <span>{item.country}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
