"use client";

import { FormEvent, MouseEvent, useMemo, useState } from "react";

type Campaign = {
  id: string;
  name: string;
  title: string;
  role: string;
  emoji: string;
  description: string;
  story: string;
  amount: string;
  contributions: number;
  video: string;
  wallet: string;
};

type CreatorForm = {
  name: string;
  title: string;
  description: string;
  emoji: string;
  video: string;
  wallet: string;
};

const defaultCampaigns: Campaign[] = [
  {
    id: "aniccasoft",
    name: "Daniel",
    title: "Construyendo AniccaSoft",
    role: "Construyendo AniccaSoft",
    emoji: "👨‍💻",
    description:
      "Herramientas de software enfocadas en productividad y transformación humana.",
    story:
      "Estoy construyendo AniccaSoft, una plataforma enfocada en productividad, desarrollo personal y transformación humana. Mi objetivo es crear herramientas digitales que ayuden a las personas a convertir sus ideas en proyectos reales.",
    amount: "$248.50",
    contributions: 125,
    video: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    wallet: "",
  },
  {
    id: "laura-podcast",
    name: "Laura",
    title: "Podcast Emprendedor",
    role: "Podcast Emprendedor",
    emoji: "🎙️",
    description: "Conversaciones semanales con emprendedores latinoamericanos.",
    story:
      "Laura está creando un podcast semanal para visibilizar historias reales de emprendimiento en Latinoamérica. La campaña busca financiar edición de audio, investigación, producción y mejores herramientas para publicar episodios con mayor calidad.",
    amount: "$96.00",
    contributions: 87,
    video: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    wallet: "",
  },
];

const defaultForm: CreatorForm = {
  name: "",
  title: "",
  description: "",
  emoji: "🚀",
  video: "",
  wallet: "",
};

const contributionOptions = [0.1, 0.5, 1, 2];

function formatAmount(value: number) {
  const number = Number(value) || 0;

  return `$${number.toLocaleString("en-US", {
    minimumFractionDigits: number % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function getYouTubeEmbedUrl(url: string) {
  if (!url) {
    return "https://www.youtube.com/embed/dQw4w9WgXcQ";
  }

  const cleanUrl = url.trim();

  if (cleanUrl.includes("youtube.com/embed/")) {
    return cleanUrl;
  }

  const watchMatch = cleanUrl.match(/[?&]v=([^&]+)/);
  if (watchMatch?.[1]) {
    return `https://www.youtube.com/embed/${watchMatch[1]}`;
  }

  const shortMatch = cleanUrl.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch?.[1]) {
    return `https://www.youtube.com/embed/${shortMatch[1]}`;
  }

  return "https://www.youtube.com/embed/dQw4w9WgXcQ";
}

export default function Home() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(defaultCampaigns);
  const [isCreatorModalOpen, setIsCreatorModalOpen] = useState(false);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [selectedAmount, setSelectedAmount] = useState(0.1);
  const [form, setForm] = useState<CreatorForm>(defaultForm);
  const [formError, setFormError] = useState("");

  const activeCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === activeCampaignId),
    [campaigns, activeCampaignId],
  );

  const selectedAmountText = formatAmount(selectedAmount);

  function scrollToProjects() {
    document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" });
  }

  function resetAmountSelector() {
    setSelectedAmount(0.1);
  }

  function openCampaign(
    event: MouseEvent<HTMLElement | HTMLButtonElement>,
    campaignId: string,
  ) {
    event.stopPropagation();
    setActiveCampaignId(campaignId);
    resetAmountSelector();
  }

  function closeCampaign() {
    setActiveCampaignId(null);
  }

  function changeCustomAmount(delta: number) {
    setSelectedAmount((current) => Number(Math.max(0.1, current + delta).toFixed(2)));
  }

  function syncCustomAmount(value: string) {
    const next = Number(value);
    setSelectedAmount(!next || next < 0.1 ? 0.1 : Number(next.toFixed(2)));
  }

  function updateForm(field: keyof CreatorForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setFormError("");
  }

  function createCreator(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = form.name.trim();
    const title = form.title.trim();
    const description = form.description.trim();
    const emoji = form.emoji.trim() || "🚀";

    if (!name || !title) {
      setFormError("Completa nombre y proyecto");
      return;
    }

    const campaign: Campaign = {
      id: `custom-${Date.now()}`,
      name,
      title,
      role: title,
      emoji,
      description: description || "Proyecto en construcción.",
      story:
        description ||
        "Este proyecto está iniciando su historia. Apóyalo para que pueda crecer, validar su idea y llegar a más personas.",
      amount: "$0",
      contributions: 0,
      video: getYouTubeEmbedUrl(form.video),
      wallet: form.wallet.trim(),
    };

    setCampaigns((current) => [campaign, ...current]);
    setForm(defaultForm);
    setFormError("");
    setIsCreatorModalOpen(false);
  }

  return (
    <>
      <div className="app-shell">
        <header className="top-bar">
          <div className="brand-mark">
            <div className="brand-symbol">A</div>
            <span>Anicca</span>
          </div>
          <button className="top-action" onClick={() => setIsCreatorModalOpen(true)}>
            Crear
          </button>
        </header>

        <section className="hero">
          <div className="hero-inner">
            <div className="logo">MiniPay para creadores</div>
            <h1 className="hero-title">Apoya proyectos. Impulsa personas.</h1>
            <p className="hero-description">
              Descubre desarrolladores, diseñadores, escritores y emprendedores.
              Contribuye directamente a sus proyectos usando MiniPay.
            </p>
            <div className="hero-actions">
              <button className="btn btn-primary" onClick={scrollToProjects}>
                Explorar
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setIsCreatorModalOpen(true)}
              >
                Crear Proyecto
              </button>
            </div>
          </div>
        </section>

        <section className="how-it-works">
          <h2 className="how-title">¿Cómo funciona?</h2>
          <p className="how-copy">
            Un flujo simple para publicar una idea, compartirla y recibir
            contribuciones directas.
          </p>

          <div className="steps-grid">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-text">
                <strong>Crea tu proyecto</strong>
                Cuéntale al mundo qué estás construyendo.
              </div>
            </div>

            <div className="step">
              <div className="step-number">2</div>
              <div className="step-text">
                <strong>Comparte tu página</strong>
                Envíala a amigos, seguidores o tu comunidad.
              </div>
            </div>

            <div className="step">
              <div className="step-number">3</div>
              <div className="step-text">
                <strong>Recibe apoyo con MiniPay</strong>
                Acepta contribuciones económicas de forma directa.
              </div>
            </div>
          </div>
        </section>

        <section className="highlight-panel">
          <p className="highlight-label">Proyecto destacado</p>
          <h2 className="highlight-value">
            <span>125 contribuciones</span> recibidas
          </h2>
          <p className="highlight-note">
            Recibe aportes desde $0.1 y convierte el interés de tu comunidad en
            apoyo real.
          </p>
        </section>

        <section className="section" id="projects">
          <div className="section-heading">
            <div>
              <span className="section-eyebrow">Explorar</span>
              <h2 className="section-title">Proyectos recientes</h2>
            </div>
            <span className="section-link">Ver todos</span>
          </div>

          <div id="creatorsContainer">
            {campaigns.map((campaign) => (
              <article
                className="creator-card"
                key={campaign.id}
                onClick={(event) => openCampaign(event, campaign.id)}
              >
                <div className="creator-header">
                  <div className="avatar">{campaign.emoji}</div>
                  <div>
                    <h3 className="name">{campaign.name}</h3>
                    <div className="role">{campaign.role}</div>
                  </div>
                </div>
                <p className="description">{campaign.description}</p>
                <div className="stats">
                  <div className="money-stats">
                    <div className="amount-received">
                      💰 {campaign.amount} recibidos
                    </div>
                    <div className="contribution-count">
                      {campaign.contributions} contribuciones
                    </div>
                  </div>
                  <button
                    className="support-btn"
                    onClick={(event) => openCampaign(event, campaign.id)}
                  >
                    Contribuir
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <nav className="bottom-nav">
        <button className="nav-item" onClick={scrollToProjects}>
          <div className="nav-icon">🔍</div>
          <div className="nav-label">Explorar</div>
        </button>
        <button className="nav-item" onClick={() => setIsCreatorModalOpen(true)}>
          <div className="nav-icon">➕</div>
          <div className="nav-label">Crear Proyecto</div>
        </button>
      </nav>

      <div
        className={`modal${isCreatorModalOpen ? " active" : ""}`}
        onClick={() => setIsCreatorModalOpen(false)}
      >
        <form className="modal-content" onSubmit={createCreator} onClick={(event) => event.stopPropagation()}>
          <div className="modal-header">
            <h2>Crear Proyecto</h2>
            <button
              className="close-modal"
              type="button"
              onClick={() => setIsCreatorModalOpen(false)}
            >
              ×
            </button>
          </div>

          <label className="field-label" htmlFor="creatorName">
            Nombre
          </label>
          <input
            id="creatorName"
            placeholder="Tu nombre"
            value={form.name}
            onChange={(event) => updateForm("name", event.target.value)}
          />

          <label className="field-label" htmlFor="creatorTitle">
            Proyecto
          </label>
          <input
            id="creatorTitle"
            placeholder="¿Qué estás construyendo?"
            value={form.title}
            onChange={(event) => updateForm("title", event.target.value)}
          />

          <label className="field-label" htmlFor="creatorDescription">
            Descripción
          </label>
          <textarea
            id="creatorDescription"
            placeholder="Describe tu proyecto"
            value={form.description}
            onChange={(event) => updateForm("description", event.target.value)}
          />

          <label className="field-label" htmlFor="creatorEmoji">
            Emoji
          </label>
          <input
            id="creatorEmoji"
            placeholder="Emoji"
            value={form.emoji}
            onChange={(event) => updateForm("emoji", event.target.value)}
          />

          <label className="field-label" htmlFor="creatorVideo">
            Video de YouTube
          </label>
          <input
            id="creatorVideo"
            placeholder="URL de YouTube para contar tu historia"
            value={form.video}
            onChange={(event) => updateForm("video", event.target.value)}
          />

          <label className="field-label" htmlFor="creatorWallet">
            Wallet MiniPay
          </label>
          <input
            id="creatorWallet"
            placeholder="Wallet MiniPay"
            value={form.wallet}
            onChange={(event) => updateForm("wallet", event.target.value)}
          />

          {formError ? <p className="form-error">{formError}</p> : null}

          <button className="create-btn" type="submit">
            Crear Proyecto
          </button>
        </form>
      </div>

      <div
        className={`modal${activeCampaign ? " active" : ""}`}
        onClick={closeCampaign}
      >
        {activeCampaign ? (
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>{activeCampaign.title}</h2>
              <button className="close-modal" onClick={closeCampaign}>
                ×
              </button>
            </div>

            <div className="campaign-video">
              <iframe
                src={activeCampaign.video}
                title="Historia del proyecto"
                allowFullScreen
              />
            </div>

            <div className="campaign-summary">
              <div className="campaign-kicker">Total recibido</div>
              <div className="campaign-amount">{activeCampaign.amount}</div>
              <div className="campaign-meta">
                {activeCampaign.contributions} contribuciones recibidas con MiniPay
              </div>
            </div>

            <h3 className="campaign-story-title">Historia del proyecto</h3>

            <p className="campaign-story">{activeCampaign.story}</p>

            <div className="amount-grid">
              {contributionOptions.map((amount) => (
                <button
                  className={`amount-option${
                    selectedAmount === amount ? " active" : ""
                  }`}
                  key={amount}
                  onClick={() => setSelectedAmount(amount)}
                >
                  {formatAmount(amount)}
                </button>
              ))}
            </div>

            <div className="custom-amount-box">
              <button
                className="amount-control"
                onClick={() => changeCustomAmount(-1)}
              >
                −
              </button>
              <input
                className="custom-amount-input"
                type="number"
                min="0.1"
                step="0.1"
                value={selectedAmount}
                onChange={(event) => syncCustomAmount(event.target.value)}
              />
              <button
                className="amount-control"
                onClick={() => changeCustomAmount(0.1)}
              >
                +
              </button>
            </div>

            <p className="selected-amount-note">
              Aporte seleccionado: <strong>{selectedAmountText}</strong>
            </p>

            <button className="full-pay-btn">
              Contribuir {selectedAmountText} con MiniPay
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}
