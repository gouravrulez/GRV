export const carrierTrackingUrl = (carrier = "India Post", trackingNumber = "") => {
  const name = carrier.toLowerCase();
  const tracking = encodeURIComponent(trackingNumber.trim());
  if (name.includes("dtdc")) return "https://www.dtdc.in/trace.asp";
  if (name.includes("delhivery")) return "https://www.delhivery.com/tracking";
  if (name.includes("blue dart") || name.includes("bluedart")) return "https://www.bluedart.com/tracking";
  if (name.includes("india post") || name.includes("speed post")) return "https://www.indiapost.gov.in/";
  return tracking
    ? `https://www.google.com/search?q=${encodeURIComponent(carrier)}+${tracking}+tracking`
    : "https://www.google.com/search?q=parcel+tracking";
};
