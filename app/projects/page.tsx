"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Info, Pencil, Search } from "lucide-react";
import { FormEvent, MouseEvent, useEffect, useMemo, useState } from "react";
import {
  BrowserProvider,
  Contract,
  isAddress,
  keccak256,
  parseUnits,
  toUtf8Bytes,
} from "ethers";
import {
  aniccaContributionsAbi,
  celoContracts,
  erc20ApprovalAbi,
} from "@/lib/celo/contracts";
import { supabase } from "@/lib/supabase/client";

type Campaign = {
  id: string;
  name: string;
  title: string;
  role: string;
  emoji: string;
  description: string;
  story: string;
  amountUnits: number;
  amount: string;
  contributions: number;
  video: string;
  wallet: string;
};

type CampaignRow = {
  id: string;
  name: string;
  title: string;
  role: string;
  emoji: string;
  description: string;
  story: string;
  amount_cents: number;
  creator_amount_units: string | number | null;
  contribution_count: number;
  video_url: string | null;
  wallet_address: string;
};

type CreatorForm = {
  name: string;
  title: string;
  description: string;
  emoji: string;
  video: string;
  wallet: string;
};

type ContributionToken = "USDT" | "COPM";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

const pageSize = 12;
const contributionOptions = [0.1, 0.5, 1, 2];
const copmDecimals = 18;
const usdtDecimals = Number(process.env.NEXT_PUBLIC_USDT_DECIMALS || 6);
const platformFeeRate = 0.03;
const creatorLimits = {
  nameMax: 60,
  titleMax: 80,
  descriptionMax: 500,
  emojiMax: 8,
  walletLength: 42,
};
const defaultForm: CreatorForm = {
  name: "",
  title: "",
  description: "",
  emoji: "🚀",
  video: "",
  wallet: "",
};
const contractAddress = process.env.NEXT_PUBLIC_ANICCA_CONTRIBUTIONS_ADDRESS;
const copmTokenAddress = process.env.NEXT_PUBLIC_COPM_TOKEN_ADDRESS;
const usdtTokenAddress = process.env.NEXT_PUBLIC_USDT_TOKEN_ADDRESS;
const celoChainId = Number(process.env.NEXT_PUBLIC_CELO_CHAIN_ID || 11142220);
const celoNetwork =
  celoChainId === celoContracts.mainnet.chainId
    ? celoContracts.mainnet
    : celoContracts.sepolia;
const campaignSelect =
  "id,name,title,role,emoji,description,story,amount_cents,creator_amount_units,contribution_count,video_url,wallet_address";

function formatAmount(value: number) {
  const number = Number(value) || 0;

  return `$${number.toLocaleString("en-US", {
    minimumFractionDigits: number % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 8,
  })}`;
}

function getCreatorAmountUnits(row: CampaignRow) {
  return Number(row.creator_amount_units ?? row.amount_cents / 100) || 0;
}

function getPaymentErrorMessage(error: unknown, tokenLabel: string) {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  const reason =
    typeof error === "object" && error !== null && "reason" in error
      ? String((error as { reason: unknown }).reason)
      : "";
  const shortMessage =
    typeof error === "object" && error !== null && "shortMessage" in error
      ? String((error as { shortMessage: unknown }).shortMessage)
      : "";
  const message = error instanceof Error ? error.message : String(error ?? "");
  const details = `${code} ${reason} ${shortMessage} ${message}`.toLowerCase();

  if (code === "4001" || code === "ACTION_REJECTED" || details.includes("user rejected")) {
    return "Cancelaste la operación en tu wallet.";
  }

  if (
    details.includes("insufficient funds") ||
    details.includes("exceeds balance") ||
    details.includes("transfer amount exceeds balance") ||
    details.includes("insufficient balance")
  ) {
    return `No tienes saldo suficiente de ${tokenLabel} o CELO para el gas.`;
  }

  if (details.includes("wallet") && details.includes("connect")) {
    return "Conecta una wallet compatible para continuar.";
  }

  if (details.includes("chain") || details.includes("network")) {
    return "Cambia tu wallet a la red Celo e intenta de nuevo.";
  }

  if (details.includes("supabase") || details.includes("no la guardo")) {
    return "Pago confirmado, pero no pudimos actualizar el proyecto. Refresca en unos segundos.";
  }

  if (details.includes("execution reverted") || details.includes("transferfailed")) {
    return `No pudimos transferir ${tokenLabel}. Revisa tu saldo y vuelve a intentar.`;
  }

  return "No pudimos completar la contribución. Revisa tu wallet e intenta de nuevo.";
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

function isValidYouTubeUrl(url: string) {
  const cleanUrl = url.trim();

  if (!cleanUrl) {
    return true;
  }

  try {
    const parsedUrl = new URL(cleanUrl);
    const host = parsedUrl.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      return parsedUrl.pathname.length > 1;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      return Boolean(
        parsedUrl.searchParams.get("v") ||
          parsedUrl.pathname.startsWith("/embed/"),
      );
    }

    return false;
  } catch {
    return false;
  }
}

function validateCreatorForm(form: CreatorForm) {
  const name = form.name.trim();
  const title = form.title.trim();
  const description = form.description.trim();
  const emoji = form.emoji.trim();
  const video = form.video.trim();
  const wallet = form.wallet.trim();

  if (name.length < 2) {
    return "El nombre debe tener al menos 2 caracteres";
  }

  if (name.length > creatorLimits.nameMax) {
    return `El nombre no puede superar ${creatorLimits.nameMax} caracteres`;
  }

  if (title.length < 3) {
    return "El proyecto debe tener al menos 3 caracteres";
  }

  if (title.length > creatorLimits.titleMax) {
    return `El proyecto no puede superar ${creatorLimits.titleMax} caracteres`;
  }

  if (description.length > creatorLimits.descriptionMax) {
    return `La descripción no puede superar ${creatorLimits.descriptionMax} caracteres`;
  }

  if (emoji && emoji.length > creatorLimits.emojiMax) {
    return "Usa un emoji o símbolo corto";
  }

  if (video && !isValidYouTubeUrl(video)) {
    return "Ingresa una URL válida de YouTube";
  }

  if (!wallet) {
    return "Agrega la wallet";
  }

  if (!isAddress(wallet)) {
    return "Ingresa una wallet válida";
  }

  return "";
}

function mapCampaignRow(row: CampaignRow): Campaign {
  const amountUnits = getCreatorAmountUnits(row);

  return {
    id: row.id,
    name: row.name,
    title: row.title,
    role: row.role,
    emoji: row.emoji,
    description: row.description,
    story: row.story,
    amountUnits,
    amount: formatAmount(amountUnits),
    contributions: row.contribution_count,
    video: getYouTubeEmbedUrl(row.video_url ?? ""),
    wallet: row.wallet_address,
  };
}

export default function ProjectsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [search, setSearch] = useState("");
  const [isCreatorModalOpen, setIsCreatorModalOpen] = useState(false);
  const [form, setForm] = useState<CreatorForm>(defaultForm);
  const [formError, setFormError] = useState("");
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [selectedAmount, setSelectedAmount] = useState(0.1);
  const [selectedToken, setSelectedToken] = useState<ContributionToken>("USDT");
  const [paymentError, setPaymentError] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [isWalletEditable, setIsWalletEditable] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const filteredCampaigns = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return campaigns;
    }

    return campaigns.filter(
      (campaign) =>
        campaign.name.toLowerCase().includes(query) ||
        campaign.title.toLowerCase().includes(query) ||
        campaign.description.toLowerCase().includes(query),
    );
  }, [campaigns, search]);

  const activeCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === activeCampaignId),
    [campaigns, activeCampaignId],
  );

  const selectedContributionText = `${selectedAmount} ${selectedToken === "COPM" ? "COPm" : "USDT"}`;
  const selectedSplit = getContributionSplit(selectedAmount);
  const platformFeePercentage = Math.round(platformFeeRate * 100);
  const creatorPercentage = 100 - platformFeePercentage;

  function resetAmountSelector() {
    setSelectedAmount(0.1);
    setSelectedToken("USDT");
    setPaymentError("");
    setPaymentStatus("");
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

  async function fillCreatorWalletFromProvider() {
    if (!window.ethereum) {
      setIsWalletEditable(true);
      setFormError("Conecta una wallet o escribe la dirección manualmente.");
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const walletAddress = Array.isArray(accounts) ? String(accounts[0] ?? "") : "";

      if (!isAddress(walletAddress)) {
        setIsWalletEditable(true);
        setFormError("No pudimos leer una wallet válida.");
        return;
      }

      setForm((current) => ({ ...current, wallet: walletAddress }));
      setIsWalletEditable(false);
      setFormError("");
    } catch {
      setIsWalletEditable(true);
      setFormError("No pudimos tomar la wallet automáticamente.");
    }
  }

  function openCreatorModal() {
    setIsCreatorModalOpen(true);
    setIsWalletEditable(false);
    void fillCreatorWalletFromProvider();
  }

  function changeCustomAmount(delta: number) {
    setSelectedAmount((current) =>
      Number(Math.max(0.1, current + delta).toFixed(2)),
    );
  }

  function syncCustomAmount(value: string) {
    const next = Number(value);
    setSelectedAmount(!next || next < 0.1 ? 0.1 : Number(next.toFixed(2)));
  }

  function updateForm(field: keyof CreatorForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setFormError("");
  }

  function getWalletErrorCode(error: unknown) {
    return typeof error === "object" && error !== null && "code" in error
      ? Number((error as { code: unknown }).code)
      : null;
  }

  async function ensureCeloNetwork(provider: EthereumProvider) {
    const expectedChainId = `0x${celoChainId.toString(16)}`;
    const currentChainId = await provider.request({ method: "eth_chainId" });

    if (currentChainId === expectedChainId) {
      return;
    }

    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: expectedChainId }],
      });
    } catch (error) {
      if (getWalletErrorCode(error) !== 4902) {
        throw error;
      }

      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: expectedChainId,
            chainName:
              celoChainId === celoContracts.mainnet.chainId
                ? "Celo Mainnet"
                : "Celo Sepolia",
            nativeCurrency: {
              name: "CELO",
              symbol: "CELO",
              decimals: 18,
            },
            rpcUrls: [celoNetwork.rpcUrl],
            blockExplorerUrls: [
              celoChainId === celoContracts.mainnet.chainId
                ? "https://celoscan.io"
                : "https://celo-sepolia.blockscout.com",
            ],
          },
        ],
      });
    }
  }

  function getCampaignHash(campaignId: string) {
    return keccak256(toUtf8Bytes(campaignId));
  }

  function getContributionSplit(amount: number) {
    const platformFee = Number((amount * platformFeeRate).toFixed(8));
    const creatorAmount = Number((amount - platformFee).toFixed(8));

    return {
      creatorAmount: String(creatorAmount),
      platformFee: String(platformFee),
    };
  }

  async function persistContribution(params: {
    campaignId: string;
    contributorWallet: string;
    recipientWallet: string;
    token: ContributionToken;
    amount: string;
    creatorAmount: string;
    platformFee: string;
    txHash: string;
  }) {
    const { error } = await supabase.from("contributions").insert({
      campaign_id: params.campaignId,
      contributor_wallet: params.contributorWallet,
      recipient_wallet: params.recipientWallet,
      token_symbol: params.token,
      amount_units: params.amount,
      creator_amount_units: params.creatorAmount,
      platform_fee_units: params.platformFee,
      tx_hash: params.txHash,
      chain_id: celoChainId,
      status: "confirmed",
    });

    if (error) {
      throw new Error(
        `Transaccion confirmada, pero Supabase no la guardo: ${error.message}`,
      );
    }
  }

  async function contribute() {
    if (!activeCampaign) {
      return;
    }

    setPaymentError("");
    setPaymentStatus("");

    if (!window.ethereum) {
      setPaymentError("Conecta una wallet compatible para continuar.");
      return;
    }

    if (!contractAddress || !isAddress(contractAddress)) {
      setPaymentError("El sistema de pagos aún no está configurado.");
      return;
    }

    if (!activeCampaign.wallet || !isAddress(activeCampaign.wallet)) {
      setPaymentError("Este proyecto no tiene una wallet válida para recibir aportes.");
      return;
    }

    const selectedTokenAddress =
      selectedToken === "COPM" ? copmTokenAddress : usdtTokenAddress;
    const selectedTokenDecimals =
      selectedToken === "COPM" ? copmDecimals : usdtDecimals;
    const selectedTokenLabel = selectedToken === "COPM" ? "COPm" : "USDT";

    if (!selectedTokenAddress || !isAddress(selectedTokenAddress)) {
      setPaymentError(
        `${selectedTokenLabel} aún no está configurado para recibir aportes.`,
      );
      return;
    }

    setIsPaying(true);

    try {
      await ensureCeloNetwork(window.ethereum);

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contributorWallet = await signer.getAddress();
      const campaignHash = getCampaignHash(activeCampaign.id);
      const contract = new Contract(
        contractAddress,
        aniccaContributionsAbi,
        signer,
      );

      setPaymentStatus("Confirma la transacción en tu wallet");

      let txHash = "";

      const amount = parseUnits(String(selectedAmount), selectedTokenDecimals);
      const token = new Contract(selectedTokenAddress, erc20ApprovalAbi, signer);

      setPaymentStatus(`Aprueba el uso de ${selectedTokenLabel} en tu wallet`);
      const approvalTx = await token.approve(contractAddress, amount);
      await approvalTx.wait();

      setPaymentStatus(`Confirma la contribución en ${selectedTokenLabel}`);
      const tx =
        selectedToken === "COPM"
          ? await contract.contributeCopm(campaignHash, activeCampaign.wallet, amount)
          : await contract.contributeUsdt(campaignHash, activeCampaign.wallet, amount);
      setPaymentStatus("Esperando confirmación en Celo");
      const receipt = await tx.wait();
      txHash = receipt?.hash ?? tx.hash;

      await persistContribution({
        campaignId: activeCampaign.id,
        contributorWallet,
        recipientWallet: activeCampaign.wallet,
        token: selectedToken,
        amount: String(selectedAmount),
        ...selectedSplit,
        txHash,
      });

      const creatorAmountUnits = Number(selectedSplit.creatorAmount) || 0;

      setCampaigns((currentCampaigns) =>
        currentCampaigns.map((campaign) =>
          campaign.id === activeCampaign.id
            ? {
                ...campaign,
                amountUnits: campaign.amountUnits + creatorAmountUnits,
                amount: formatAmount(campaign.amountUnits + creatorAmountUnits),
                contributions: campaign.contributions + 1,
              }
            : campaign,
        ),
      );
      setPaymentStatus("Contribución confirmada");
    } catch (error) {
      setPaymentError(getPaymentErrorMessage(error, selectedTokenLabel));
    } finally {
      setIsPaying(false);
    }
  }

  async function createCreator(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = form.name.trim();
    const title = form.title.trim();
    const description = form.description.trim();
    const emoji = form.emoji.trim() || "🚀";
    const wallet = form.wallet.trim();
    const validationError = validateCreatorForm(form);

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsCreatingCampaign(true);
    setFormError("");

    const story =
      description ||
      "Este proyecto está iniciando su historia. Apóyalo para que pueda crecer, validar su idea y llegar a más personas.";

    const { data, error } = await supabase
      .from("campaigns")
      .insert({
        name,
        title,
        role: title,
        emoji,
        description: description || "Proyecto en construcción.",
        story,
        amount_cents: 0,
        creator_amount_units: 0,
        contribution_count: 0,
        video_url: getYouTubeEmbedUrl(form.video),
        wallet_address: wallet,
      })
      .select(campaignSelect)
      .single();

    setIsCreatingCampaign(false);

    if (error) {
      setFormError("No se pudo guardar el proyecto en Supabase");
      return;
    }

    const campaign = mapCampaignRow(data);

    setCampaigns((current) => [campaign, ...current]);
    setForm(defaultForm);
    setFormError("");
    setIsCreatorModalOpen(false);
  }

  async function loadCampaigns(nextPage: number) {
    const from = nextPage * pageSize;
    const to = from + pageSize - 1;

    const { data, error: queryError } = await supabase
      .from("campaigns")
      .select(campaignSelect)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (queryError) {
      setError("No se pudieron cargar los proyectos");
      return;
    }

    const nextCampaigns = data.map(mapCampaignRow);

    setCampaigns((current) =>
      nextPage === 0 ? nextCampaigns : [...current, ...nextCampaigns],
    );
    setHasMore(nextCampaigns.length === pageSize);
    setPage(nextPage);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialCampaigns() {
      setIsLoading(true);
      setError("");
      await loadCampaigns(0);

      if (isMounted) {
        setIsLoading(false);
      }
    }

    loadInitialCampaigns();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!paymentError) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setPaymentError("");
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [paymentError]);

  async function loadMore() {
    setIsLoadingMore(true);
    await loadCampaigns(page + 1);
    setIsLoadingMore(false);
  }

  return (
    <div className="app-shell">
      {paymentError ? (
        <div className="toast-notice error" role="alert">
          {paymentError}
        </div>
      ) : null}

      <header className="top-bar">
        <Link className="icon-link" href="/" aria-label="Volver al inicio">
          <ArrowLeft className="nav-icon" aria-hidden="true" />
        </Link>
        <div className="brand-mark">
          <Link href="/" aria-label="Volver al inicio">
            <Image
              className="brand-logo"
              src="/LOGO.png"
              alt="Anicca"
              width={100}
              height={36}
              priority
            />
          </Link>
        </div>
        <button className="top-action" onClick={openCreatorModal}>
          Crear
        </button>
      </header>

      <main className="projects-page">
        <section className="section projects-header">
          <span className="section-eyebrow">Explorar</span>
          <h1 className="section-title">Todos los proyectos</h1>
          <div className="search-box">
            <Search className="search-icon" aria-hidden="true" />
            <input
              placeholder="Buscar proyecto"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </section>

        <section className="section" id="projectsList">
          {isLoading ? <p className="status-message">Cargando proyectos...</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
          {!isLoading && !error && filteredCampaigns.length === 0 ? (
            <p className="status-message">No hay proyectos para mostrar.</p>
          ) : null}

          <div id="creatorsContainer">
            {filteredCampaigns.map((campaign) => (
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
                      {campaign.amount} recibidos
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

          {!search && hasMore ? (
            <button
              className="load-more-btn"
              type="button"
              onClick={loadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? "Cargando..." : "Cargar más"}
            </button>
          ) : null}
        </section>
      </main>

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

          <label className="field-label" htmlFor="projectsCreatorName">
            Nombre
          </label>
          <input
            id="projectsCreatorName"
            required
            minLength={2}
            maxLength={creatorLimits.nameMax}
            placeholder="Tu nombre"
            value={form.name}
            onChange={(event) => updateForm("name", event.target.value)}
          />

          <label className="field-label" htmlFor="projectsCreatorTitle">
            Proyecto
          </label>
          <input
            id="projectsCreatorTitle"
            required
            minLength={3}
            maxLength={creatorLimits.titleMax}
            placeholder="¿Qué estás construyendo?"
            value={form.title}
            onChange={(event) => updateForm("title", event.target.value)}
          />

          <label className="field-label" htmlFor="projectsCreatorDescription">
            Descripción
          </label>
          <textarea
            id="projectsCreatorDescription"
            maxLength={creatorLimits.descriptionMax}
            placeholder="Describe tu proyecto"
            value={form.description}
            onChange={(event) => updateForm("description", event.target.value)}
          />

          <label className="field-label wallet-label" htmlFor="projectsCreatorEmoji">
            Emoji
            <span
              className="tooltip-trigger"
              aria-label="Este símbolo aparecerá como avatar del proyecto en las tarjetas."
              tabIndex={0}
            >
              <Info className="tooltip-icon" aria-hidden="true" />
            </span>
          </label>
          <input
            id="projectsCreatorEmoji"
            maxLength={creatorLimits.emojiMax}
            placeholder="Emoji"
            value={form.emoji}
            onChange={(event) => updateForm("emoji", event.target.value)}
          />

          <label className="field-label" htmlFor="projectsCreatorVideo">
            Video de YouTube
          </label>
          <input
            id="projectsCreatorVideo"
            type="url"
            placeholder="URL de YouTube para contar tu historia"
            value={form.video}
            onChange={(event) => updateForm("video", event.target.value)}
          />

          <label className="field-label wallet-label" htmlFor="projectsCreatorWallet">
            Wallet
            <span
              className="tooltip-trigger"
              aria-label="Se tomará la dirección pública conectada para recibir los aportes del proyecto."
              tabIndex={0}
            >
              <Info className="tooltip-icon" aria-hidden="true" />
            </span>
          </label>
          <div className="wallet-input-wrap">
            <button
              className="wallet-edit-btn"
              type="button"
              aria-label="Editar wallet manualmente"
              onClick={() => setIsWalletEditable(true)}
            >
              <Pencil className="wallet-edit-icon" aria-hidden="true" />
            </button>
            <input
              id="projectsCreatorWallet"
              required
              maxLength={creatorLimits.walletLength}
              readOnly={!isWalletEditable}
              spellCheck={false}
              placeholder="Conecta tu wallet"
              value={form.wallet}
              onChange={(event) => updateForm("wallet", event.target.value)}
            />
          </div>

          {formError ? <p className="form-error">{formError}</p> : null}

          <button className="create-btn" type="submit" disabled={isCreatingCampaign}>
            {isCreatingCampaign ? "Guardando..." : "Crear Proyecto"}
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
                {activeCampaign.contributions} contribuciones recibidas
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

            <div className="token-toggle" aria-label="Seleccionar moneda">
              <button
                className={`token-option${selectedToken === "USDT" ? " active" : ""}`}
                onClick={() => setSelectedToken("USDT")}
              >
                USDT
              </button>
              <button
                className={`token-option${selectedToken === "COPM" ? " active" : ""}`}
                onClick={() => setSelectedToken("COPM")}
              >
                COPm
              </button>
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
              Aporte seleccionado: <strong>{selectedContributionText}</strong>
              <span>
                Creador: {creatorPercentage}% · Plataforma:{" "}
                {platformFeePercentage}%
              </span>
            </p>

            {paymentStatus ? (
              <p
                className={`payment-notice ${
                  paymentStatus.includes("confirmada") ? "success" : "info"
                }`}
              >
                {paymentStatus}
              </p>
            ) : null}
            <button className="full-pay-btn" onClick={contribute} disabled={isPaying}>
              {isPaying
                ? "Procesando..."
                : `Contribuir ${selectedContributionText}`}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
