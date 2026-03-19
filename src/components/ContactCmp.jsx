import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const customIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const location = [48.1351, 11.582]; // Munich, Germany
const address = "Tal 44, 80331 Munich, Germany";

export default function ContactCmp() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setStatusMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Something went wrong.");
      }

      setStatusMsg("Your message has been sent successfully.");
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
    } catch (error) {
      setStatusMsg(error.message || "Failed to send message.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="kp-contact">
      <div className="kp-contact-container">
        <div className="kp-contact-header">
          <h2 className="kp-contact-title">Contact KickPredict</h2>
          <p className="kp-contact-subtitle">
            Have a question, partnership idea, or support request? Reach out to
            our team and we’ll get back to you as soon as possible.
          </p>
        </div>

        <div className="kp-contact-grid">
          {/* LEFT */}
          <div className="kp-contact-left">
            <form className="kp-contact-form" onSubmit={handleSubmit}>
              <div className="kp-form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="kp-form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="kp-form-group">
                <label htmlFor="subject">Subject</label>
                <input
                  id="subject"
                  type="text"
                  name="subject"
                  placeholder="Enter message subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="kp-form-group">
                <label htmlFor="message">Message</label>
                <textarea
                  id="message"
                  name="message"
                  rows="6"
                  placeholder="Write your message..."
                  value={formData.message}
                  onChange={handleChange}
                  required
                ></textarea>
              </div>

              <button
                className="kp-contact-btn"
                type="submit"
                disabled={loading}
              >
                {loading ? "Sending..." : "Send Message"}
              </button>

              <a href="https://t.me/kickprediction" className="kp-telegram-btn">
                For fast response, contact us on Telegram
              </a>

              {statusMsg && <p className="kp-contact-status">{statusMsg}</p>}
            </form>
          </div>

          {/* RIGHT */}
          <div className="kp-contact-right">
            <div className="kp-map-wrap">
              <div className="kp-map-card">
                <h4>Our Address</h4>
                <p>{address}</p>
              </div>

              <MapContainer
                center={location}
                zoom={13}
                scrollWheelZoom={false}
                className="kp-map"
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <Marker position={location} icon={customIcon}>
                  <Popup>{address}</Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
