import { useEffect, useRef, useState } from "react";

const IMAGES = {};
const CODE_ADMIN = "FLSCENTS";

const PARFUMS = [];

const PACKAGES = [];

const ARRIVAGES = [];

const TOUS = [...PARFUMS, ...PACKAGES, ...ARRIVAGES];

function Reveal({ children, delay = 0 }) {
  const ref = useRef(null);
  const [vu, setVu] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setVu(true), { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className="reveal" style={{
      opacity: vu ? 1 : 0,
      transform: vu ? "translateY(0)" : "translateY(26px)",
      transitionDelay: `${delay}ms`,
    }}>{children}</div>
  );
}

export default function FlScents() {
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [panier, setPanier] = useState({});
  const [tiroir, setTiroir] = useState(false);
  const [etape, setEtape] = useState("panier");
  const [client, setClient] = useState({ nom: "", tel: "", adresse: "", note: "" });
  const [contact, setContact] = useState({ nom: "", tel: "", msg: "" });
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const [numCommande, setNumCommande] = useState("");
  const [toast, setToast] = useState("");
  const [adminOuvert, setAdminOuvert] = useState(false);
  const [codeSaisi, setCodeSaisi] = useState("");
  const [adminOk, setAdminOk] = useState(false);
  const [commandes, setCommandes] = useState([]);
  const [messages, setMessages] = useState([]);
  const [adminChargement, setAdminChargement] = useState(false);

  const items = Object.entries(panier).map(([id, qte]) => ({ ...TOUS.find(t => t.id === id), qte }));
  const nbArticles = items.reduce((s, i) => s + i.qte, 0);
  const total = items.reduce((s, i) => s + i.prix * i.qte, 0);

  const ajouter = (id) => {
    setPanier(p => ({ ...p, [id]: (p[id] || 0) + 1 }));
    const prod = TOUS.find(t => t.id === id);
    setToast(`${prod.nom} ajouté au panier ✓`);
    setTimeout(() => setToast(""), 2200);
  };
  const changerQte = (id, d) => {
    setPanier(p => {
      const q = (p[id] || 0) + d;
      const n = { ...p };
      if (q <= 0) delete n[id]; else n[id] = q;
      return n;
    });
  };

  const aller = (id) => {
    setMenuOuvert(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const envoyerCommande = async () => {
    setErreur("");
    if (!client.nom.trim() || !client.tel.trim()) {
      setErreur("Écris ton nom et ton numéro de téléphone pour qu'on puisse te contacter.");
      return;
    }
    setEnvoiEnCours(true);
    const num = "FL-" + String(Date.now()).slice(-6);
    const commande = {
      numero: num,
      date: new Date().toLocaleString("fr-CA"),
      articles: items.map(i => ({ nom: i.nom, prix: i.prix, qte: i.qte })),
      total,
      client,
      statut: "nouvelle",
    };
    const resumeArticles = commande.articles.map(a => `${a.qte} x ${a.nom} — ${a.prix * a.qte} $`).join("\n");
    try {
      await fetch("https://formsubmit.co/ajax/francisfregeau6@gmail.com", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          _subject: `Nouvelle commande ${num} — Fl.scents`,
          Numero: num,
          Nom: client.nom,
          Telephone: client.tel,
          Adresse: client.adresse || "(non fournie)",
          Note: client.note || "(aucune)",
          Articles: resumeArticles,
          Total: total + " $",
        }),
      });
    } catch (e) { /* l'email est prioritaire, on continue même si ça échoue */ }
    try {
      const res = await window.storage.set("commande:" + Date.now(), JSON.stringify(commande), true);
      if (!res) throw new Error("échec");
    } catch (e) { /* window.storage ne marche que dans Claude, on ignore hors Claude */ }
    setNumCommande(num);
    setEtape("envoye");
    setPanier({});
    setEnvoiEnCours(false);
  };

  const chargerCommandes = async () => {
    setAdminChargement(true);
    try {
      const liste = await window.storage.list("commande:", true);
      const cles = (liste?.keys || []).sort().reverse();
      const resultats = [];
      for (const k of cles) {
        try {
          const r = await window.storage.get(k, true);
          if (r?.value) resultats.push({ cle: k, ...JSON.parse(r.value) });
        } catch (e) { }
      }
      setCommandes(resultats);
      
      const listeMsgs = await window.storage.list("contact:", true);
      const clesMsgs = (listeMsgs?.keys || []).sort().reverse();
      const msgs = [];
      for (const k of clesMsgs) {
        try {
          const r = await window.storage.get(k, true);
          if (r?.value) msgs.push({ cle: k, ...JSON.parse(r.value) });
        } catch (e) { }
      }
      setMessages(msgs);
    } catch (e) {
      setCommandes([]);
      setMessages([]);
    }
    setAdminChargement(false);
  };

  const marquerTraitee = async (c) => {
    try {
      await window.storage.set(c.cle, JSON.stringify({ ...c, cle: undefined, statut: "traitée" }), true);
      chargerCommandes();
    } catch (e) {}
  };
  
  const supprimerCommande = async (c) => {
    try {
      await window.storage.delete(c.cle, true);
      chargerCommandes();
    } catch (e) {}
  };

  useEffect(() => { if (adminOk) chargerCommandes(); }, [adminOk]);

  return (
    <div className="site">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Jost:wght@300;400;500;600&display=swap');
        .site {
          --fond:#f1e7d3; --creme:#faf5ea; --blanc:#fdfaf4;
          --encre:#221b12; --brun:#4a3d2a;
          --or:#a4813f; --or-fonce:#7d6028; --or-pale:#d8c297;
          --gris:#8a7a5f;
          background:var(--fond); color:var(--encre);
          font-family:'Jost',sans-serif; min-height:100vh; overflow-x:hidden;
        }
        .site * { box-sizing:border-box; margin:0; }

        .nav {
          position:fixed; top:0; left:0; right:0; z-index:50;
          display:flex; align-items:center; justify-content:space-between;
          padding:14px 5vw;
          background:rgba(241,231,211,.92); backdrop-filter:blur(8px);
          border-bottom:1px solid rgba(164,129,63,.18);
        }
        .logo { font-family:'Cormorant Garamond',serif; font-weight:600; font-size:1.5rem; letter-spacing:.12em; cursor:pointer; user-select:none; color:var(--encre); }
        .logo em { color:var(--or); font-style:normal; }
        .nav-droite { display:flex; align-items:center; gap:22px; }
        .liens { display:flex; gap:30px; }
        .liens button { background:none; border:none; color:var(--brun); cursor:pointer; font-family:'Jost',sans-serif; font-size:.76rem; letter-spacing:.24em; text-transform:uppercase; padding:6px 0; position:relative; transition:color .3s; }
        .liens button::after { content:''; position:absolute; left:0; bottom:0; height:1px; width:0; background:var(--or); transition:width .35s; }
        .liens button:hover, .liens button:focus-visible { color:var(--or-fonce); outline:none; }
        .liens button:hover::after { width:100%; }
        .btn-panier { position:relative; background:none; border:1px solid rgba(164,129,63,.5); color:var(--encre); cursor:pointer; padding:9px 16px; font-size:1rem; transition:background .3s, border-color .3s; }
        .btn-panier:hover { border-color:var(--or); background:rgba(164,129,63,.1); }
        .pastille { position:absolute; top:-9px; right:-9px; min-width:20px; height:20px; background:var(--encre); color:var(--fond); border-radius:50%; font-size:.7rem; font-weight:600; display:flex; align-items:center; justify-content:center; padding:0 5px; }
        .burger { display:none; background:none; border:none; color:var(--encre); font-size:1.5rem; cursor:pointer; }

        .hero { position:relative; min-height:100vh; padding:100px 22px 70px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; isolation:isolate; overflow:hidden; }
        .lumiere { position:absolute; inset:0; z-index:-2; background: radial-gradient(52vmax 42vmax at 78% 18%, rgba(253,248,236,.95), transparent 65%), radial-gradient(46vmax 40vmax at 15% 82%, rgba(216,194,151,.35), transparent 65%), linear-gradient(165deg, #f5ecdb 0%, #f1e7d3 55%, #ecdfc6 100%); }
        .ombres { position:absolute; inset:0; z-index:-1; opacity:.5; pointer-events:none; background: radial-gradient(30vmax 8vmax at 50% -4%, rgba(74,61,42,.14), transparent 70%), radial-gradient(22vmax 30vmax at 108% 60%, rgba(74,61,42,.10), transparent 70%); animation:respirer 14s ease-in-out infinite alternate; }
        @keyframes respirer { from { opacity:.35; } to { opacity:.6; } }
        .sur-titre { font-size:.76rem; letter-spacing:.5em; text-transform:uppercase; color:var(--or); margin-bottom:18px; animation:apparaitre 1.2s ease both; }
        .titre { font-family:'Cormorant Garamond',serif; font-weight:500; font-size:clamp(3.4rem,13vw,8.5rem); letter-spacing:.06em; line-height:1; color:var(--encre); animation:apparaitre 1.2s ease .2s both; }
        .titre em { color:var(--or); font-style:normal; }
        .separateur { display:flex; align-items:center; gap:12px; margin:26px 0 18px; animation:apparaitre 1.2s ease .35s both; }
        .separateur span { width:46px; height:1px; background:var(--or); display:block; }
        .separateur i { color:var(--or); font-style:normal; font-size:.7rem; }
        .tagline { font-size:.92rem; letter-spacing:.55em; text-transform:uppercase; color:var(--brun); font-weight:300; margin-bottom:40px; padding-left:.55em; animation:apparaitre 1.2s ease .45s both; }
        .atouts-hero { display:flex; align-items:center; gap:26px; margin-bottom:42px; flex-wrap:wrap; justify-content:center; animation:apparaitre 1.2s ease .6s both; }
        .atout-hero { font-size:.7rem; letter-spacing:.18em; text-transform:uppercase; color:var(--brun); line-height:1.7; font-weight:400; }
        .atout-hero i { display:block; font-style:normal; color:var(--or); font-size:1.25rem; margin-bottom:8px; }
        .barre { width:1px; height:38px; background:rgba(164,129,63,.4); }
        .devise { position:relative; font-size:.86rem; letter-spacing:.42em; text-transform:uppercase; color:var(--gris); font-weight:300; padding:14px 40px; margin-bottom:30px; animation:apparaitre 1.2s ease .72s both; }
        .coin { position:absolute; width:22px; height:22px; border:1px solid rgba(164,129,63,.55); }
        .coin.g { left:0; bottom:0; border-top:none; border-right:none; }
        .coin.d { right:0; top:0; border-bottom:none; border-left:none; }
        .hero-texte { max-width:500px; color:var(--brun); font-weight:300; font-size:1.05rem; line-height:1.75; animation:apparaitre 1.2s ease .82s both; }
        .hero-texte strong { color:var(--or-fonce); font-weight:500; }
        .cta { margin-top:34px; padding:16px 48px; border:1px solid var(--encre); color:var(--encre); background:transparent; cursor:pointer; font-family:'Jost',sans-serif; font-size:.82rem; letter-spacing:.3em; text-transform:uppercase; position:relative; overflow:hidden; transition:color .4s; animation:apparaitre 1.2s ease .5s both; }
        .cta::before { content:''; position:absolute; inset:0; background:var(--encre); transform:translateY(101%); transition:transform .4s cubic-bezier(.4,0,.2,1); z-index:-1; }
        .cta:hover { color:var(--fond); }
        .cta:hover::before { transform:translateY(0); }
        @keyframes apparaitre { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }

        .bandeau { background:var(--encre); color:var(--or-pale); overflow:hidden; padding:12px 0; white-space:nowrap; }
        .bandeau-piste { display:inline-block; animation:defiler 22s linear infinite; }
        .bandeau span { font-size:.76rem; letter-spacing:.3em; text-transform:uppercase; font-weight:500; margin:0 30px; }
        @keyframes defiler { from { transform:translateX(0); } to { transform:translateX(-50%); } }

        section { padding:96px 5vw; }
        .entete-section { text-align:center; margin-bottom:60px; }
        .entete-section .mini { font-size:.74rem; letter-spacing:.45em; text-transform:uppercase; color:var(--or); display:block; margin-bottom:14px; }
        .entete-section h2 { font-family:'Cormorant Garamond',serif; font-weight:500; font-size:clamp(2.1rem,5vw,3.4rem); letter-spacing:.06em; color:var(--encre); }
        .filet { width:54px; height:1px; background:var(--or); margin:20px auto 0; position:relative; }
        .filet::after { content:'•'; position:absolute; top:-11px; left:50%; transform:translateX(-50%); color:var(--or); font-size:.7rem; background:none; }
        .reveal { transition:opacity .8s ease, transform .8s ease; }

        .grille { display:grid; gap:30px; grid-template-columns:repeat(auto-fill,minmax(255px,1fr)); max-width:1240px; margin:0 auto; }
        .carte { background:var(--blanc); border:1px solid rgba(164,129,63,.22); text-align:center; position:relative; height:100%; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 6px 24px -14px rgba(74,61,42,.28); transition:transform .45s cubic-bezier(.4,0,.2,1), border-color .45s, box-shadow .45s; }
        .carte:hover { transform:translateY(-10px); border-color:var(--or); box-shadow:0 28px 56px -22px rgba(125,96,40,.4); }
        .badge { position:absolute; top:14px; right:14px; z-index:2; font-size:.6rem; letter-spacing:.2em; text-transform:uppercase; color:var(--fond); background:var(--encre); padding:5px 12px; }
        .badge-or { background:var(--or); color:#fdfaf4; }
        .photo-cadre { height:250px; overflow:hidden; background:#fbf8f1; position:relative; }
        .photo-cadre img { width:100%; height:100%; object-fit:contain; padding:14px; transition:transform .7s cubic-bezier(.4,0,.2,1); display:block; }
        .carte:hover .photo-cadre img { transform:scale(1.06); }
        .carte-arrivage .photo-cadre img { filter:saturate(.92); }
        .carte-arrivage:hover .photo-cadre img { filter:saturate(1); }
        .photo-cadre::before { content:''; position:absolute; inset:10px; z-index:2; border:1px solid rgba(164,129,63,.3); pointer-events:none; }
        .carte-corps { padding:22px 22px 24px; display:flex; flex-direction:column; flex:1; border-top:1px solid rgba(164,129,63,.15); }
        .carte h3 { font-family:'Cormorant Garamond',serif; font-weight:600; font-size:1.4rem; letter-spacing:.03em; margin-bottom:6px; color:var(--encre); }
        .carte .notes { color:var(--gris); font-size:.82rem; font-weight:300; letter-spacing:.05em; margin-bottom:8px; }
        .carte .desc { color:var(--gris); font-size:.85rem; font-weight:300; line-height:1.65; margin-bottom:8px; }
        .carte .prix { color:var(--or-fonce); font-size:1.3rem; font-weight:500; margin:auto 0 16px; padding-top:8px; font-family:'Cormorant Garamond',serif; }
        .bientot { margin:auto 0 4px; padding-top:10px; font-family:'Cormorant Garamond',serif; font-weight:600; font-style:italic; color:var(--or-fonce); font-size:1.15rem; letter-spacing:.04em; }
        .btn-ajout { padding:13px 20px; width:100%; border:1px solid var(--encre); background:transparent; color:var(--encre); cursor:pointer; font-family:'Jost',sans-serif; font-size:.73rem; letter-spacing:.26em; text-transform:uppercase; transition:background .35s, color .35s; }
        .btn-ajout:hover, .btn-ajout:focus-visible { background:var(--encre); color:var(--fond); outline:none; }
        .packages-section { background:var(--creme); }
        .packages-section .photo-cadre { height:280px; }

        .arrivages { background:var(--creme); border-bottom:1px solid rgba(164,129,63,.18); }
        .arrivages-intro { max-width:460px; margin:26px auto 0; color:var(--gris); font-weight:300; font-size:.98rem; line-height:1.75; }

        .contact { background:var(--creme); }
        .contact-intro { max-width:520px; margin:26px auto 0; color:var(--gris); font-weight:300; font-size:.98rem; line-height:1.75; }
        .contact-boite { max-width:480px; margin:50px auto 0; background:var(--blanc); border:1px solid rgba(164,129,63,.22); padding:40px 32px; box-shadow:0 12px 34px -16px rgba(74,61,42,.2); }
        .contact-boite .champ { margin-bottom:22px; }
        .contact-boite label { display:block; font-size:.72rem; letter-spacing:.22em; text-transform:uppercase; color:var(--gris); margin-bottom:7px; }
        .contact-boite input, .contact-boite textarea { width:100%; background:var(--blanc); border:1px solid rgba(164,129,63,.35); color:var(--encre); padding:13px 16px; font-family:'Jost',sans-serif; font-size:.95rem; transition:border-color .3s; }
        .contact-boite input:focus, .contact-boite textarea:focus { outline:none; border-color:var(--or-fonce); }
        .contact-boite .btn-or { margin-top:8px; }

        .apropos-grid { max-width:1000px; margin:0 auto; display:grid; gap:38px; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); text-align:center; }
        .atout .ico { font-size:1.8rem; margin-bottom:14px; color:var(--or); }
        .atout h4 { font-family:'Cormorant Garamond',serif; font-weight:600; font-size:1.4rem; letter-spacing:.04em; margin-bottom:10px; color:var(--encre); }
        .atout p { color:var(--gris); font-weight:300; font-size:.9rem; line-height:1.7; }

        footer { background:var(--encre); color:var(--or-pale); padding:44px 5vw 34px; text-align:center; font-size:.74rem; letter-spacing:.2em; font-weight:300; }
        footer .mini-logo { font-family:'Cormorant Garamond',serif; font-weight:600; font-size:1.4rem; letter-spacing:.15em; color:#f7f0e2; display:block; margin-bottom:8px; }
        footer .suivez { font-size:.68rem; letter-spacing:.35em; text-transform:uppercase; color:var(--or-pale); margin:18px 0 12px; }
        .reseaux { display:flex; justify-content:center; gap:16px; margin-bottom:22px; flex-wrap:wrap; }
        .reseaux a { display:inline-flex; align-items:center; gap:8px; padding:11px 24px; border:1px solid rgba(216,194,151,.45); color:#f7f0e2; text-decoration:none; font-size:.76rem; letter-spacing:.2em; text-transform:uppercase; transition:background .3s, color .3s, border-color .3s; }
        .reseaux a:hover { background:var(--or-pale); color:var(--encre); border-color:var(--or-pale); }
        .lien-admin { background:none; border:none; color:rgba(216,194,151,.4); font-size:.66rem; letter-spacing:.15em; cursor:pointer; margin-top:16px; font-family:'Jost',sans-serif; }
        .lien-admin:hover { color:var(--or-pale); }

        .voile { position:fixed; inset:0; background:rgba(34,27,18,.45); z-index:80; opacity:0; pointer-events:none; transition:opacity .35s; }
        .voile.visible { opacity:1; pointer-events:auto; }
        .tiroir { position:fixed; top:0; right:0; bottom:0; width:min(430px,100vw); z-index:90; background:var(--blanc); border-left:1px solid rgba(164,129,63,.3); transform:translateX(102%); transition:transform .45s cubic-bezier(.4,0,.2,1); display:flex; flex-direction:column; box-shadow:-16px 0 44px rgba(34,27,18,.18); }
        .tiroir.ouvert { transform:translateX(0); }
        .tiroir-tete { display:flex; align-items:center; justify-content:space-between; padding:22px 26px; border-bottom:1px solid rgba(164,129,63,.22); }
        .tiroir-tete h3 { font-family:'Cormorant Garamond',serif; font-weight:600; font-size:1.5rem; letter-spacing:.06em; color:var(--encre); }
        .fermer { background:none; border:none; color:var(--gris); font-size:1.4rem; cursor:pointer; }
        .fermer:hover { color:var(--encre); }
        .tiroir-corps { flex:1; overflow-y:auto; padding:20px 26px; }
        .ligne { display:flex; gap:14px; align-items:center; padding:14px 0; border-bottom:1px solid rgba(164,129,63,.15); }
        .ligne img { width:56px; height:70px; object-fit:contain; border:1px solid rgba(164,129,63,.3); background:#fbf8f1; }
        .ligne-info { flex:1; }
        .ligne-info .n { font-size:.9rem; margin-bottom:4px; color:var(--encre); }
        .ligne-info .p { color:var(--or-fonce); font-size:.86rem; }
        .qte { display:flex; align-items:center; gap:10px; }
        .qte button { width:26px; height:26px; background:none; border:1px solid rgba(164,129,63,.5); color:var(--encre); cursor:pointer; font-size:.95rem; line-height:1; }
        .qte button:hover { background:var(--encre); color:var(--fond); }
        .panier-vide { text-align:center; color:var(--gris); font-weight:300; padding:60px 20px; line-height:1.8; }
        .tiroir-pied { padding:22px 26px; border-top:1px solid rgba(164,129,63,.22); background:var(--creme); }
        .total-ligne { display:flex; justify-content:space-between; font-size:1.05rem; margin-bottom:16px; color:var(--encre); }
        .total-ligne strong { color:var(--or-fonce); font-size:1.3rem; font-family:'Cormorant Garamond',serif; }
        .btn-or { width:100%; padding:15px; border:none; cursor:pointer; background:var(--encre); color:var(--fond); font-family:'Jost',sans-serif; font-size:.8rem; letter-spacing:.26em; text-transform:uppercase; font-weight:500; transition:background .3s, transform .3s, box-shadow .3s; }
        .btn-or:hover { background:var(--or-fonce); transform:translateY(-2px); box-shadow:0 12px 26px -12px rgba(125,96,40,.6); }
        .btn-or:disabled { opacity:.55; cursor:wait; transform:none; }
        .btn-retour { width:100%; background:none; border:none; color:var(--gris); margin-top:12px; cursor:pointer; font-size:.78rem; letter-spacing:.18em; text-transform:uppercase; font-family:'Jost',sans-serif; }
        .btn-retour:hover { color:var(--encre); }

        .champ { margin-bottom:16px; }
        .champ label { display:block; font-size:.72rem; letter-spacing:.22em; text-transform:uppercase; color:var(--gris); margin-bottom:7px; }
        .champ input, .champ textarea { width:100%; background:var(--blanc); border:1px solid rgba(164,129,63,.4); color:var(--encre); padding:12px 14px; font-family:'Jost',sans-serif; font-size:.95rem; }
        .champ input:focus, .champ textarea:focus { outline:none; border-color:var(--or-fonce); }
        .note-info { color:var(--gris); font-size:.8rem; font-weight:300; line-height:1.7; margin:14px 0 18px; }
        .erreur { color:#a83a2a; font-size:.84rem; margin-bottom:14px; line-height:1.5; }
        .confirmation { text-align:center; padding:40px 10px; }
        .confirmation .coche { font-size:2.6rem; color:var(--or); margin-bottom:18px; }
        .confirmation h4 { font-family:'Cormorant Garamond',serif; font-weight:600; font-size:1.7rem; letter-spacing:.04em; margin-bottom:14px; color:var(--encre); }
        .confirmation p { color:var(--gris); font-weight:300; line-height:1.8; font-size:.92rem; }
        .confirmation .num { color:var(--or-fonce); font-size:1.15rem; letter-spacing:.15em; margin:14px 0; }

        .toast { position:fixed; bottom:26px; left:50%; transform:translateX(-50%); background:var(--encre); color:var(--fond); padding:13px 26px; z-index:100; font-size:.82rem; letter-spacing:.12em; font-weight:400; animation:toast-in .3s ease; box-shadow:0 12px 30px rgba(34,27,18,.35); }
        @keyframes toast-in { from { opacity:0; transform:translate(-50%,16px); } to { opacity:1; transform:translate(-50%,0); } }

        .admin-panneau { position:fixed; inset:0; z-index:110; background:var(--fond); overflow-y:auto; padding:60px 5vw; }
        .admin-tete { display:flex; justify-content:space-between; align-items:center; max-width:900px; margin:0 auto 34px; }
        .admin-tete h3 { font-family:'Cormorant Garamond',serif; font-weight:600; font-size:2rem; letter-spacing:.05em; color:var(--encre); }
        .admin-boite { max-width:900px; margin:0 auto; }
        .admin-code { max-width:380px; margin:80px auto; text-align:center; }
        .cmd { background:var(--blanc); border:1px solid rgba(164,129,63,.28); padding:22px 24px; margin-bottom:18px; text-align:left; box-shadow:0 6px 20px -14px rgba(74,61,42,.3); }
        .cmd-tete { display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:12px; }
        .cmd-tete .num { color:var(--or-fonce); letter-spacing:.1em; font-weight:500; }
        .cmd-tete .date { color:var(--gris); font-size:.82rem; }
        .statut { font-size:.66rem; letter-spacing:.2em; text-transform:uppercase; padding:4px 10px; }
        .statut.nouvelle { background:var(--encre); color:var(--fond); }
        .statut.traitée { background:rgba(164,129,63,.18); color:var(--gris); }
        .cmd ul { list-style:none; padding:0; margin:10px 0; }
        .cmd li { display:flex; justify-content:space-between; font-size:.9rem; color:var(--encre); padding:4px 0; font-weight:300; }
        .cmd .client-info { color:var(--gris); font-size:.86rem; line-height:1.7; margin-top:10px; font-weight:300; }
        .cmd .cmd-total { text-align:right; color:var(--or-fonce); font-size:1.05rem; margin-top:8px; }
        .cmd-actions { display:flex; gap:12px; margin-top:16px; }
        .cmd-actions button { background:none; border:1px solid rgba(164,129,63,.5); color:var(--encre); padding:8px 16px; cursor:pointer; font-size:.72rem; letter-spacing:.16em; text-transform:uppercase; font-family:'Jost',sans-serif; }
        .cmd-actions button:hover { background:var(--encre); color:var(--fond); border-color:var(--encre); }
        .admin-vide { text-align:center; color:var(--gris); padding:60px 0; font-weight:300; }

        @media (max-width:760px) {
          .liens { position:fixed; inset:0; background:rgba(241,231,211,.98); flex-direction:column; align-items:center; justify-content:center; gap:38px; transform:translateX(100%); transition:transform .4s; z-index:70; }
          .liens.ouvert { transform:translateX(0); }
          .liens button { font-size:1rem; }
          .burger { display:block; z-index:75; }
        }
        @media (prefers-reduced-motion:reduce) {
          .bandeau-piste, .reveal, .carte, .photo-cadre img, .tiroir, .cta::before, .ombres { transition:none !important; animation:none !important; }
        }
      `}</style>

      <nav className="nav">
        <div className="logo" onClick={() => aller("accueil")}>Fl<em>.</em>scents</div>
        <div className="nav-droite">
          <div className={`liens ${menuOuvert ? "ouvert" : ""}`}>
            <button onClick={() => aller("accueil")}>Accueil</button>
            <button onClick={() => aller("arrivages")}>Arrivages</button>
            <button onClick={() => aller("collection")}>Collection</button>
            <button onClick={() => aller("packages")}>Packages</button>
            <button onClick={() => aller("contact")}>Contact</button>
          </div>
          <button className="btn-panier" onClick={() => { setTiroir(true); setEtape("panier"); }} aria-label="Panier">
            🛍{nbArticles > 0 && <span className="pastille">{nbArticles}</span>}
          </button>
          <button className="burger" onClick={() => setMenuOuvert(!menuOuvert)} aria-label="Menu">
            {menuOuvert ? "✕" : "☰"}
          </button>
        </div>
      </nav>

      <header className="hero" id="accueil">
        <div className="lumiere" aria-hidden="true" />
        <div className="ombres" aria-hidden="true" />
        <p className="sur-titre">Bienvenue chez</p>
        <h1 className="titre">Fl<em>.</em>scents</h1>
        <div className="separateur" aria-hidden="true"><span /><i>•</i><span /></div>
        <p className="tagline">Curated Fragrances</p>
        <div className="atouts-hero">
          <div className="atout-hero"><i>❁</i>Produits<br />authentiques</div>
          <div className="barre" />
          <div className="atout-hero"><i>➳</i>Livraison<br />rapide</div>
          <div className="barre" />
          <div className="atout-hero"><i>✦</i>Paiement<br />sécurisé</div>
        </div>
        <p className="devise"><span className="coin g" />Luxe · Qualité · Passion<span className="coin d" /></p>
        <p className="hero-texte">
          Des parfums de grandes marques <strong>à bas prix</strong> —
          authentiques, envoûtants, et commandés directement ici.
        </p>
        <button className="cta" onClick={() => aller("collection")}>Magasiner maintenant</button>
      </header>

      <div className="bandeau" aria-hidden="true">
        <div className="bandeau-piste">
          {Array.from({ length: 2 }).map((_, r) => (
            <span key={r}>
              <span>✦ Produits authentiques</span>
              <span>✦ Livraison rapide</span>
              <span>✦ Paiement sécurisé</span>
              <span>✦ Grandes marques à bas prix</span>
              <span>✦ Produits authentiques</span>
              <span>✦ Livraison rapide</span>
              <span>✦ Paiement sécurisé</span>
              <span>✦ Grandes marques à bas prix</span>
            </span>
          ))}
        </div>
      </div>

      <section id="arrivages" className="arrivages">
        <Reveal>
          <div className="entete-section">
            <span className="mini">Restez à l'affût</span>
            <h2>Prochains Arrivages</h2>
            <div className="filet" />
            <p className="arrivages-intro">
              De nouvelles fragrances s'en viennent chez Fl.scents ✨
              Suivez-nous sur Instagram pour être les premiers avertis.
            </p>
          </div>
        </Reveal>
        {ARRIVAGES.length > 0 && (
          <div className="grille">
            {ARRIVAGES.map((p, i) => (
              <Reveal key={p.id} delay={(i % 4) * 80}>
                <div className="carte carte-arrivage">
                  <span className="badge badge-or">Bientôt disponible</span>
                  <div className="photo-cadre">
                    <img src={IMAGES[p.id]} alt={p.nom} loading="lazy" />
                  </div>
                  <div className="carte-corps">
                    <h3>{p.nom}</h3>
                    {p.notes && <p className="notes">{p.notes}</p>}
                    <p className="bientot">Bientôt disponible !</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      <section id="collection">
        <Reveal>
          <div className="entete-section">
            <span className="mini">Curated Fragrances</span>
            <h2>La Collection</h2>
            <div className="filet" />
          </div>
        </Reveal>
        {PARFUMS.length === 0 && (
          <p style={{ textAlign: "center", fontStyle: "italic", opacity: 0.7 }}>Nouvelle collection en préparation — revenez bientôt ✨</p>
        )}
        <div className="grille">
          {PARFUMS.map((p, i) => (
            <Reveal key={p.id} delay={(i % 4) * 80}>
              <div className="carte">
                {p.badge && <span className="badge">{p.badge}</span>}
                <div className="photo-cadre">
                  <img src={IMAGES[p.id]} alt={p.nom} loading="lazy" />
                </div>
                <div className="carte-corps">
                  <h3>{p.nom}</h3>
                  <p className="notes">{p.notes}</p>
                  <p className="prix">{p.prix} $</p>
                  <button className="btn-ajout" onClick={() => ajouter(p.id)}>Ajouter au panier</button>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="packages-section" id="packages">
        <Reveal>
          <div className="entete-section">
            <span className="mini">Économisez avec nos ensembles</span>
            <h2>Packages & Coffrets</h2>
            <div className="filet" />
          </div>
        </Reveal>
        {PACKAGES.length === 0 && (
          <p style={{ textAlign: "center", fontStyle: "italic", opacity: 0.7 }}>Nos packages et coffrets reviennent bientôt ✨</p>
        )}
        <div className="grille">
          {PACKAGES.map((p, i) => (
            <Reveal key={p.id} delay={(i % 3) * 100}>
              <div className="carte">
                {p.badge && <span className="badge">{p.badge}</span>}
                <div className="photo-cadre">
                  <img src={IMAGES[p.id]} alt={p.nom} loading="lazy" />
                </div>
                <div className="carte-corps">
                  <h3>{p.nom}</h3>
                  <p className="desc">{p.desc}</p>
                  <p className="prix">{p.prix} $</p>
                  <button className="btn-ajout" onClick={() => ajouter(p.id)}>Ajouter au panier</button>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="contact" id="contact">
        <Reveal>
          <div className="entete-section">
            <span className="mini">Une question ?</span>
            <h2>Nous Contacter</h2>
            <div className="filet" />
            <p className="contact-intro">
              Vous avez une question ? Vous cherchez un parfum spécifique ?
              Laissez-nous vos coordonnées et nous vous répondrons rapidement !
            </p>
          </div>
        </Reveal>
        <div className="contact-boite">
          <form onSubmit={async (e) => {
            e.preventDefault();
            setErreur("");
            if (!contact.nom.trim() || !contact.tel.trim()) {
              setErreur("Écris ton nom et ton numéro de téléphone.");
              return;
            }
            setEnvoiEnCours(true);
            try {
              await fetch("https://formsubmit.co/ajax/francisfregeau6@gmail.com", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: JSON.stringify({
                  _subject: `Nouveau message — Fl.scents`,
                  Nom: contact.nom,
                  Telephone: contact.tel,
                  Message: contact.msg || "(aucun message)",
                }),
              });
            } catch (e) { /* on continue même si ça échoue */ }
            try {
              await window.storage.set("contact:" + Date.now(), JSON.stringify({
                date: new Date().toLocaleString("fr-CA"),
                ...contact
              }), true);
            } catch (e) { /* window.storage ne marche que dans Claude */ }
            setToast("Message envoyé ! On vous contactera bientôt ✓");
            setContact({ nom: "", tel: "", msg: "" });
            setTimeout(() => setToast(""), 3000);
            setEnvoiEnCours(false);
          }}>
            <div className="champ">
              <label>Nom complet *</label>
              <input 
                value={contact.nom} 
                onChange={e => setContact({...contact, nom: e.target.value})}
                placeholder="Ton nom" 
              />
            </div>
            <div className="champ">
              <label>Téléphone *</label>
              <input 
                value={contact.tel} 
                onChange={e => setContact({...contact, tel: e.target.value})}
                placeholder="514 555-0123" 
              />
            </div>
            <div className="champ">
              <label>Message</label>
              <textarea 
                rows={4} 
                value={contact.msg} 
                onChange={e => setContact({...contact, msg: e.target.value})}
                placeholder="Votre question, demande spéciale..." 
              />
            </div>
            {erreur && <p className="erreur">{erreur}</p>}
            <button className="btn-or" type="submit" disabled={envoiEnCours}>
              {envoiEnCours ? "Envoi..." : "Envoyer"}
            </button>
          </form>
        </div>
      </section>

      <section id="apropos">
        <Reveal>
          <div className="entete-section">
            <span className="mini">Pourquoi Fl.scents</span>
            <h2>Luxe · Qualité · Passion</h2>
            <div className="filet" />
          </div>
        </Reveal>
        <div className="apropos-grid">
          {[
            { ico: "❁", t: "Produits authentiques", d: "Chaque fragrance est 100 % authentique et vérifiée avec le plus grand soin avant de vous être envoyée." },
            { ico: "➳", t: "Livraison rapide", d: "Votre commande est traitée rapidement — on vous contacte dès sa réception pour organiser la livraison." },
            { ico: "✦", t: "Paiement sécurisé", d: "Aucun paiement en ligne : tout se confirme directement avec nous, par virement ou à la livraison." },
          ].map((a, i) => (
            <Reveal key={a.t} delay={i * 110}>
              <div className="atout">
                <div className="ico">{a.ico}</div>
                <h4>{a.t}</h4>
                <p>{a.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <footer>
        <span className="mini-logo">Fl.scents</span>
        Curated Fragrances
        <p className="suivez">Suivez-nous</p>
        <div className="reseaux">
          <a href="https://instagram.com/fl.scents" target="_blank" rel="noopener noreferrer">◎ Instagram · @fl.scents</a>
          <a href="https://facebook.com/Fl.scents" target="_blank" rel="noopener noreferrer">ⓕ Facebook · Fl.scents</a>
        </div>
        © {new Date().getFullYear()} Fl.scents — Tous droits réservés
        <div>
          <button className="lien-admin" onClick={() => { setAdminOuvert(true); setCodeSaisi(""); setAdminOk(false); }}>
            Espace propriétaire
          </button>
        </div>
      </footer>

      <div className={`voile ${tiroir ? "visible" : ""}`} onClick={() => setTiroir(false)} />
      <aside className={`tiroir ${tiroir ? "ouvert" : ""}`} aria-hidden={!tiroir}>
        <div className="tiroir-tete">
          <h3>{etape === "infos" ? "Vos infos" : etape === "envoye" ? "Merci !" : "Panier"}</h3>
          <button className="fermer" onClick={() => setTiroir(false)} aria-label="Fermer">✕</button>
        </div>

        {etape === "panier" && (
          <>
            <div className="tiroir-corps">
              {items.length === 0 ? (
                <p className="panier-vide">Votre panier est vide.<br />Ajoutez vos fragrances préférées ✨</p>
              ) : items.map(i => (
                <div className="ligne" key={i.id}>
                  <img src={IMAGES[i.id]} alt="" />
                  <div className="ligne-info">
                    <div className="n">{i.nom}</div>
                    <div className="p">{i.prix} $ / unité</div>
                  </div>
                  <div className="qte">
                    <button onClick={() => changerQte(i.id, -1)} aria-label="Moins">−</button>
                    <span>{i.qte}</span>
                    <button onClick={() => changerQte(i.id, 1)} aria-label="Plus">+</button>
                  </div>
                </div>
              ))}
            </div>
            {items.length > 0 && (
              <div className="tiroir-pied">
                <div className="total-ligne"><span>Total</span><strong>{total} $</strong></div>
                <button className="btn-or" onClick={() => setEtape("infos")}>Passer la commande</button>
              </div>
            )}
          </>
        )}

        {etape === "infos" && (
          <>
            <div className="tiroir-corps">
              <div className="champ">
                <label>Nom complet *</label>
                <input value={client.nom} onChange={e => setClient({ ...client, nom: e.target.value })} placeholder="Ton nom" />
              </div>
              <div className="champ">
                <label>Téléphone *</label>
                <input value={client.tel} onChange={e => setClient({ ...client, tel: e.target.value })} placeholder="514 555-0123" />
              </div>
              <div className="champ">
                <label>Adresse / ville (pour la livraison)</label>
                <input value={client.adresse} onChange={e => setClient({ ...client, adresse: e.target.value })} placeholder="Ville ou adresse" />
              </div>
              <div className="champ">
                <label>Note (optionnel)</label>
                <textarea rows={3} value={client.note} onChange={e => setClient({ ...client, note: e.target.value })} placeholder="Question, précision..." />
              </div>
              <p className="note-info">
                Aucun paiement en ligne : on vous contacte pour confirmer la commande,
                la livraison et le paiement (virement ou à la livraison).
                Vos coordonnées sont transmises à Fl.scents pour traiter votre commande.
              </p>
              {erreur && <p className="erreur">{erreur}</p>}
            </div>
            <div className="tiroir-pied">
              <div className="total-ligne"><span>Total</span><strong>{total} $</strong></div>
              <button className="btn-or" onClick={envoyerCommande} disabled={envoiEnCours}>
                {envoiEnCours ? "Envoi en cours..." : "Confirmer ma commande"}
              </button>
              <button className="btn-retour" onClick={() => setEtape("panier")}>← Retour au panier</button>
            </div>
          </>
        )}

        {etape === "envoye" && (
          <div className="tiroir-corps">
            <div className="confirmation">
              <div className="coche">✓</div>
              <h4>Commande reçue !</h4>
              <p className="num">N° {numCommande}</p>
              <p>
                Merci pour votre commande chez Fl.scents.
                On vous contacte très bientôt au numéro fourni pour
                confirmer la livraison et le paiement. ✨
              </p>
              <button className="btn-or" style={{ marginTop: 26 }} onClick={() => { setTiroir(false); setEtape("panier"); }}>
                Continuer à magasiner
              </button>
            </div>
          </div>
        )}
      </aside>

      {toast && <div className="toast">{toast}</div>}

      {adminOuvert && (
        <div className="admin-panneau">
          <div className="admin-tete">
            <h3>Espace propriétaire</h3>
            <button className="fermer" onClick={() => setAdminOuvert(false)} aria-label="Fermer">✕</button>
          </div>
          {!adminOk ? (
            <div className="admin-code">
              <div className="champ">
                <label>Code d'accès</label>
                <input
                  type="password"
                  value={codeSaisi}
                  onChange={e => setCodeSaisi(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && codeSaisi.trim().toUpperCase() === CODE_ADMIN && setAdminOk(true)}
                  placeholder="••••••••"
                />
              </div>
              <button className="btn-or" onClick={() => codeSaisi.trim().toUpperCase() === CODE_ADMIN && setAdminOk(true)}>
                Entrer
              </button>
            </div>
          ) : (
            <div className="admin-boite">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
                <p style={{ color: "#8a7a5f", fontWeight: 300, fontSize: ".9rem" }}>
                  {commandes.length} commande{commandes.length > 1 ? "s" : ""} | {messages.length} message{messages.length > 1 ? "s" : ""}
                </p>
                <button className="btn-or" style={{ width: "auto", padding: "10px 22px" }} onClick={chargerCommandes}>
                  {adminChargement ? "Chargement..." : "Actualiser"}
                </button>
              </div>

              <h4 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "1.5rem", color: "#221b12", marginTop: 30, marginBottom: 16 }}>Commandes</h4>
              {commandes.length === 0 && !adminChargement && (
                <p className="admin-vide">Aucune commande pour le moment.</p>
              )}
              {commandes.map(c => (
                <div className="cmd" key={c.cle}>
                  <div className="cmd-tete">
                    <span className="num">{c.numero}</span>
                    <span className="date">{c.date}</span>
                    <span className={`statut ${c.statut}`}>{c.statut}</span>
                  </div>
                  <ul>
                    {c.articles.map((a, i) => (
                      <li key={i}><span>{a.qte} × {a.nom}</span><span>{a.prix * a.qte} $</span></li>
                    ))}
                  </ul>
                  <div className="cmd-total">Total : <strong>{c.total} $</strong></div>
                  <div className="client-info">
                    👤 {c.client.nom} · 📞 {c.client.tel}
                    {c.client.adresse && <> · 📍 {c.client.adresse}</>}
                    {c.client.note && <><br />📝 {c.client.note}</>}
                  </div>
                  <div className="cmd-actions">
                    {c.statut !== "traitée" && <button onClick={() => marquerTraitee(c)}>Marquer traitée</button>}
                    <button onClick={() => supprimerCommande(c)}>Supprimer</button>
                  </div>
                </div>
              ))}

              <h4 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "1.5rem", color: "#221b12", marginTop: 40, marginBottom: 16 }}>Messages de contact</h4>
              {messages.length === 0 && !adminChargement && (
                <p className="admin-vide">Aucun message pour le moment.</p>
              )}
              {messages.map(m => (
                <div className="cmd" key={m.cle} style={{ borderLeft: "3px solid #a4813f" }}>
                  <div className="cmd-tete">
                    <span className="num" style={{ fontWeight: 600 }}>{m.nom}</span>
                    <span className="date">{m.date}</span>
                  </div>
                  <div className="client-info">
                    📞 {m.tel}
                    {m.msg && <><br />📝 {m.msg}</>}
                  </div>
                  <div className="cmd-actions">
                    <button onClick={() => {
                      try { window.storage.delete(m.cle, true); chargerCommandes(); } catch (e) {}
                    }}>Supprimer</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
