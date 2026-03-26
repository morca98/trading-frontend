import { useState, useMemo } from "react";
import { trpc } from "../lib/trpc";

// Regiões disponíveis
const REGIONS = ["US", "PT", "EU", "BR"];

// Setores disponíveis
const SECTORS = [
  "Technology",
  "Blue Chip",
  "PSI",
  "Euro Stoxx",
  "B3",
  "Growth/Meme",
  "Energy",
  "Financial",
  "Healthcare",
  "Consumer",
  "Industrial",
  "Utilities",
  "Materials",
  "Other",
];

// Mapeamento de região para bandeira
const REGION_FLAG: Record<string, string> = {
  US: "🇺🇸",
  PT: "🇵🇹",
  EU: "🇪🇺",
  BR: "🇧🇷",
};

// Mapeamento de região para cor
const REGION_COLOR: Record<string, string> = {
  US: "bg-blue-100 text-blue-800 border-blue-200",
  PT: "bg-green-100 text-green-800 border-green-200",
  EU: "bg-yellow-100 text-yellow-800 border-yellow-200",
  BR: "bg-orange-100 text-orange-800 border-orange-200",
};

export function TickerManager() {
  const [search, setSearch] = useState("");
  const [filterRegion, setFilterRegion] = useState<string>("ALL");
  const [newSymbol, setNewSymbol] = useState("");
  const [newRegion, setNewRegion] = useState("US");
  const [newSector, setNewSector] = useState("Technology");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Queries e mutations
  const { data: symbols = [], refetch, isLoading } = trpc.trading.getSymbols.useQuery();
  const addMutation = trpc.trading.addSymbol.useMutation({
    onSuccess: (data) => {
      setFeedback({ type: "success", msg: `✅ ${data.symbol} adicionado com sucesso!` });
      setNewSymbol("");
      refetch();
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (err) => {
      setFeedback({ type: "error", msg: `❌ Erro ao adicionar: ${err.message}` });
      setTimeout(() => setFeedback(null), 4000);
    },
  });
  const removeMutation = trpc.trading.removeSymbol.useMutation({
    onSuccess: (data) => {
      setFeedback({ type: "success", msg: `🗑️ ${data.symbol} removido.` });
      setConfirmDelete(null);
      refetch();
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (err) => {
      setFeedback({ type: "error", msg: `❌ Erro ao remover: ${err.message}` });
      setTimeout(() => setFeedback(null), 4000);
    },
  });

  // Filtrar lista
  const filtered = useMemo(() => {
    return symbols.filter((s) => {
      const matchSearch =
        search.trim() === "" ||
        s.symbol.toLowerCase().includes(search.toLowerCase()) ||
        (s.sector || "").toLowerCase().includes(search.toLowerCase());
      const matchRegion = filterRegion === "ALL" || s.region === filterRegion;
      return matchSearch && matchRegion;
    });
  }, [symbols, search, filterRegion]);

  // Contagens por região
  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: symbols.length };
    REGIONS.forEach((r) => {
      c[r] = symbols.filter((s) => s.region === r).length;
    });
    return c;
  }, [symbols]);

  const handleAdd = () => {
    const sym = newSymbol.trim().toUpperCase();
    if (!sym) return;
    addMutation.mutate({ symbol: sym, region: newRegion, sector: newSector });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd();
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>📡</span> Gestão de Tickers
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {symbols.length} ativos monitorizados pelo bot
          </p>
        </div>
        {isLoading && (
          <span className="text-xs text-gray-500 animate-pulse">A carregar...</span>
        )}
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`mx-6 mt-4 px-4 py-2 rounded-lg text-sm font-medium ${
            feedback.type === "success"
              ? "bg-green-900/50 text-green-300 border border-green-700"
              : "bg-red-900/50 text-red-300 border border-red-700"
          }`}
        >
          {feedback.msg}
        </div>
      )}

      {/* Formulário de adição */}
      <div className="px-6 pt-5 pb-4 border-b border-gray-700/50">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-semibold">
          Adicionar novo ticker
        </p>
        <div className="flex flex-wrap gap-2 items-end">
          {/* Símbolo */}
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs text-gray-500 mb-1 block">Símbolo</label>
            <input
              type="text"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              placeholder="ex: AAPL, EDP.LS"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 uppercase"
            />
          </div>

          {/* Região */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Região</label>
            <select
              value={newRegion}
              onChange={(e) => setNewRegion(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {REGION_FLAG[r]} {r}
                </option>
              ))}
            </select>
          </div>

          {/* Setor */}
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs text-gray-500 mb-1 block">Setor</label>
            <select
              value={newSector}
              onChange={(e) => setNewSector(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              {SECTORS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Botão */}
          <button
            onClick={handleAdd}
            disabled={!newSymbol.trim() || addMutation.isPending}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            {addMutation.isPending ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <span>+</span>
            )}
            Adicionar
          </button>
        </div>
      </div>

      {/* Filtros e pesquisa */}
      <div className="px-6 py-3 border-b border-gray-700/50 flex flex-wrap gap-2 items-center">
        {/* Pesquisa */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍  Pesquisar símbolo ou setor..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Filtros por região */}
        <div className="flex gap-1 flex-wrap">
          {["ALL", ...REGIONS].map((r) => (
            <button
              key={r}
              onClick={() => setFilterRegion(r)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                filterRegion === r
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300"
              }`}
            >
              {r === "ALL" ? `Todos (${counts.ALL})` : `${REGION_FLAG[r]} ${r} (${counts[r] ?? 0})`}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de tickers */}
      <div className="overflow-y-auto max-h-[420px]">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            {search || filterRegion !== "ALL"
              ? "Nenhum ticker encontrado com esses filtros."
              : "Nenhum ticker na base de dados. Adiciona o primeiro acima!"}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-700/50">
                <th className="text-left px-6 py-2 font-medium">Símbolo</th>
                <th className="text-left px-4 py-2 font-medium">Região</th>
                <th className="text-left px-4 py-2 font-medium">Setor</th>
                <th className="text-right px-6 py-2 font-medium">Ação</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr
                  key={s.symbol}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors group"
                >
                  {/* Símbolo */}
                  <td className="px-6 py-2.5">
                    <span className="font-mono font-semibold text-white">{s.symbol}</span>
                  </td>

                  {/* Região */}
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                        REGION_COLOR[s.region] || "bg-gray-700 text-gray-300 border-gray-600"
                      }`}
                    >
                      {REGION_FLAG[s.region] || "🌍"} {s.region}
                    </span>
                  </td>

                  {/* Setor */}
                  <td className="px-4 py-2.5 text-gray-400 text-xs">{s.sector || "—"}</td>

                  {/* Ação */}
                  <td className="px-6 py-2.5 text-right">
                    {confirmDelete === s.symbol ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-red-400">Tens a certeza?</span>
                        <button
                          onClick={() => removeMutation.mutate({ symbol: s.symbol })}
                          disabled={removeMutation.isPending}
                          className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded font-semibold"
                        >
                          {removeMutation.isPending ? "..." : "Sim"}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded"
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(s.symbol)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 bg-gray-700 hover:bg-red-900/50 hover:text-red-400 text-gray-400 text-xs rounded border border-gray-600 hover:border-red-700"
                        title={`Remover ${s.symbol}`}
                      >
                        🗑️ Remover
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer com contagem filtrada */}
      {filtered.length > 0 && (
        <div className="px-6 py-2 border-t border-gray-700/50 text-xs text-gray-500 text-right">
          A mostrar {filtered.length} de {symbols.length} tickers
        </div>
      )}
    </div>
  );
}
