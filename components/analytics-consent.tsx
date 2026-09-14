"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import styles from "./analytics-consent.module.css";

const measurementId = "G-GQB6EJJ76E";
type Consent = "accepted" | "essential" | null;

export function AnalyticsConsent() {
  const [consent, setConsent] = useState<Consent>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("kaoma_analytics_consent") as Consent;
    if (saved === "accepted" || saved === "essential") setConsent(saved);
    else setOpen(true);
  }, []);

  function choose(value: Exclude<Consent, null>) {
    localStorage.setItem("kaoma_analytics_consent", value);
    setConsent(value);
    setOpen(false);
  }

  return (
    <>
      {consent === "accepted" && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
            strategy="afterInteractive"
          />
          <Script id="kaoma-google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', '${measurementId}', { anonymize_ip: true });
            `}
          </Script>
        </>
      )}
      {open ? (
        <section className={styles.banner} aria-label="Cookie preferences">
          <div>
            <strong>Your privacy, always</strong>
            <p>KAOMA uses optional analytics to understand visits and improve the store. Essential features work without analytics.</p>
            <a href="/privacy">Read our privacy policy</a>
          </div>
          <div className={styles.actions}>
            <button className={styles.secondary} onClick={() => choose("essential")}>Essential only</button>
            <button className={styles.primary} onClick={() => choose("accepted")}>Accept analytics</button>
          </div>
        </section>
      ) : consent ? (
        <button className={styles.settings} onClick={() => setOpen(true)}>Cookie settings</button>
      ) : null}
    </>
  );
}
