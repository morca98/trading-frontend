import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bell, Trash2, Plus, Check } from 'lucide-react';

interface Alert {
  id: string;
  symbol: string;
  type: 'above' | 'below';
  price: number;
  enabled: boolean;
  createdAt: number;
}

interface AlertsPanelProps {
  symbol: string;
}

export default function AlertsPanel({ symbol }: AlertsPanelProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [newPrice, setNewPrice] = useState('');
  const [newType, setNewType] = useState<'above' | 'below'>('above');
  const [telegramToken, setTelegramToken] = useState('');
  const [discordWebhook, setDiscordWebhook] = useState('');
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    loadAlerts();
    loadConfig();
  }, [symbol]);

  const loadAlerts = () => {
    const stored = localStorage.getItem(`alerts_${symbol}`);
    if (stored) {
      setAlerts(JSON.parse(stored));
    }
  };

  const loadConfig = () => {
    const token = localStorage.getItem('telegram_token');
    const webhook = localStorage.getItem('discord_webhook');
    if (token) setTelegramToken(token);
    if (webhook) setDiscordWebhook(webhook);
  };

  const saveConfig = () => {
    localStorage.setItem('telegram_token', telegramToken);
    localStorage.setItem('discord_webhook', discordWebhook);
    setShowConfig(false);
  };

  const addAlert = () => {
    if (!newPrice) return;

    const alert: Alert = {
      id: Date.now().toString(),
      symbol,
      type: newType,
      price: parseFloat(newPrice),
      enabled: true,
      createdAt: Date.now(),
    };

    const updated = [...alerts, alert];
    setAlerts(updated);
    localStorage.setItem(`alerts_${symbol}`, JSON.stringify(updated));
    setNewPrice('');
  };

  const removeAlert = (id: string) => {
    const updated = alerts.filter((a) => a.id !== id);
    setAlerts(updated);
    localStorage.setItem(`alerts_${symbol}`, JSON.stringify(updated));
  };

  const toggleAlert = (id: string) => {
    const updated = alerts.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a));
    setAlerts(updated);
    localStorage.setItem(`alerts_${symbol}`, JSON.stringify(updated));
  };

  return (
    <div className="space-y-4">
      {/* Configuração */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={showConfig ? 'default' : 'outline'}
          onClick={() => setShowConfig(!showConfig)}
          className={showConfig ? 'bg-blue-600' : 'border-slate-600'}
        >
          Configurar
        </Button>
      </div>

      {showConfig && (
        <Card className="bg-slate-700 border-slate-600">
          <CardContent className="pt-4 space-y-3">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Token Telegram</label>
              <Input
                type="password"
                placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                value={telegramToken}
                onChange={(e) => setTelegramToken(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Discord Webhook</label>
              <Input
                type="password"
                placeholder="https://discordapp.com/api/webhooks/..."
                value={discordWebhook}
                onChange={(e) => setDiscordWebhook(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white text-sm"
              />
            </div>
            <Button
              onClick={saveConfig}
              className="w-full bg-green-600 hover:bg-green-700 text-white text-sm"
            >
              Guardar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Novo Alerta */}
      <Card className="bg-slate-700 border-slate-600">
        <CardContent className="pt-4 space-y-3">
          <div className="flex gap-2">
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as 'above' | 'below')}
              className="flex-1 bg-slate-800 border border-slate-600 text-white rounded px-2 py-1 text-sm"
            >
              <option value="above">Acima de</option>
              <option value="below">Abaixo de</option>
            </select>
            <Input
              type="number"
              placeholder="Preço"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              className="flex-1 bg-slate-800 border-slate-600 text-white text-sm"
            />
            <Button
              onClick={addAlert}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Alertas */}
      <div className="space-y-2">
        <p className="text-slate-400 text-xs font-semibold">ALERTAS ATIVOS ({alerts.filter((a) => a.enabled).length})</p>
        {alerts.length > 0 ? (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-3 rounded-lg flex items-center justify-between ${
                alert.enabled ? 'bg-slate-700' : 'bg-slate-800 opacity-50'
              }`}
            >
              <div className="flex items-center gap-3 flex-1">
                <Bell className={`w-4 h-4 ${alert.enabled ? 'text-blue-400' : 'text-slate-500'}`} />
                <div>
                  <p className="text-white text-sm font-semibold">
                    {alert.type === 'above' ? '↑' : '↓'} ${alert.price.toFixed(2)}
                  </p>
                  <p className="text-slate-400 text-xs">{symbol}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleAlert(alert.id)}
                  className={`p-1 rounded ${alert.enabled ? 'bg-green-600/20 text-green-400' : 'bg-slate-600/20 text-slate-400'}`}
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => removeAlert(alert.id)}
                  className="p-1 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-slate-400 text-center py-4 text-xs">Nenhum alerta configurado</p>
        )}
      </div>

      {/* Info */}
      <div className="bg-slate-700 p-3 rounded-lg">
        <p className="text-slate-400 text-xs mb-2">
          💡 <span className="font-semibold">Dica:</span> Configure Telegram ou Discord para receber notificações em tempo real
        </p>
      </div>
    </div>
  );
}
