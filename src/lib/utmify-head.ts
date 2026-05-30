export const PANINI_UTMIFY_PIXEL_ID = "6a19e26e67f74872754aaf4f";

export const paniniUtmifyPixelHeadScript = `
  window.pixelId = "${PANINI_UTMIFY_PIXEL_ID}";
  try {
    var lead = localStorage.getItem("lead");
    if (lead) {
      var parsedLead = JSON.parse(lead);
      if (parsedLead && parsedLead.pixelId !== window.pixelId) {
        parsedLead.pixelId = window.pixelId;
        localStorage.setItem("lead", JSON.stringify(parsedLead));
      }
    }
  } catch (e) {}
  var a = document.createElement("script");
  a.setAttribute("async", "");
  a.setAttribute("defer", "");
  a.setAttribute("src", "https://cdn.utmify.com.br/scripts/pixel/pixel.js");
  document.head.appendChild(a);
`;

export const paniniUtmifyHeadScripts = [
  { children: paniniUtmifyPixelHeadScript },
  {
    src: "https://cdn.utmify.com.br/scripts/utms/latest.js",
    async: true,
    defer: true,
    "data-utmify-prevent-xcod-sck": "",
    "data-utmify-prevent-subids": "",
  } as any,
];