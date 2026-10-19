// Public website settings. Never put database passwords or secret/service-role keys here.
export const config = {
  company: {
    name: "Ralf Gebert Timing Systems",
    owner: "Ralf Gebert",
    email: "ralfgebert01@gmail.com",
    phone: "060 973 4901",
    phoneInternational: "+27609734901",
    address: "",
    mapUrl: "",
  },
  supabase: { url: "https://jozxswzkuzdinkpmymel.supabase.co", publishableKey: "sb_publishable_fEdkhCVoD9xdhlPp_ytNQw_lBGrod3d" },
  quoteFunctionUrl: "",
  turnstileSiteKey: "",
  previewData: false,
  systems: [
    { id: "01", number: "001", name: "System 001 - Ralf", team: "Ralf - Race results dashboard", url: "https://gebert55.github.io/live-results/", status: "ready" },
    { id: "02", number: "002", name: "System 002 - Gareth", team: "Gareth - Race results dashboard", url: "https://gunit177.github.io/Truvelo-Timing-Results/", status: "ready" },
    { id: "03", number: "003", name: "System 003 - Pierre", team: "Pierre - Race results dashboard", url: "https://trudrags.github.io/live-results/", status: "ready" },
  ],
};
