import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { Input } from '@srcbook/components/src/components/ui/input';
import { Button } from '@srcbook/components/src/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@srcbook/components/src/components/ui/select';
import { Switch } from '@srcbook/components/src/components/ui/switch';
import { toast } from 'sonner';
import SRCBOOK_CONFIG from '@/config';

const API_BASE_URL = `${SRCBOOK_CONFIG.api.origin}/api`;

type McpServerConfig = {
  id: number;
  name: string;
  transport: 'stdio' | 'http';
  command: string | null;
  args: string | null;
  url: string | null;
  env: string | null;
  enabled: boolean;
};

async function fetchMcpServers(): Promise<McpServerConfig[]> {
  const response = await fetch(`${API_BASE_URL}/mcp/servers`);
  const data = await response.json();
  return data.data || [];
}

async function createMcpServer(server: Omit<McpServerConfig, 'id'>): Promise<McpServerConfig> {
  const response = await fetch(`${API_BASE_URL}/mcp/servers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(server),
  });
  const data = await response.json();
  return data.data;
}

async function updateMcpServer(
  id: number,
  updates: Partial<McpServerConfig>,
): Promise<McpServerConfig> {
  const response = await fetch(`${API_BASE_URL}/mcp/servers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const data = await response.json();
  return data.data;
}

async function deleteMcpServer(id: number): Promise<void> {
  await fetch(`${API_BASE_URL}/mcp/servers/${id}`, { method: 'DELETE' });
}

export function McpServerSettings() {
  const [servers, setServers] = useState<McpServerConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  const loadServers = useCallback(async () => {
    try {
      const data = await fetchMcpServers();
      setServers(data);
    } catch (e) {
      console.error('Failed to load MCP servers:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  const handleDelete = async (id: number) => {
    try {
      await deleteMcpServer(id);
      setServers((prev) => prev.filter((s) => s.id !== id));
      toast.success('MCP server removed');
    } catch {
      toast.error('Failed to remove MCP server');
    }
  };

  const handleToggle = async (id: number, enabled: boolean) => {
    try {
      await updateMcpServer(id, { enabled });
      setServers((prev) => prev.map((s) => (s.id === id ? { ...s, enabled } : s)));
    } catch {
      toast.error('Failed to update MCP server');
    }
  };

  const handleAdd = async (config: Omit<McpServerConfig, 'id'>) => {
    try {
      const server = await createMcpServer(config);
      setServers((prev) => [...prev, server]);
      setShowAddForm(false);
      toast.success('MCP server added');
    } catch {
      toast.error('Failed to add MCP server');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm opacity-70">
        <Loader2 size={16} className="animate-spin" />
        <span>Loading MCP servers...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {servers.length === 0 && !showAddForm && (
        <p className="text-sm opacity-70">
          No MCP servers configured. Add external tool servers to enhance AI capabilities.
        </p>
      )}

      {servers.map((server) => (
        <div
          key={server.id}
          className="flex items-center justify-between gap-3 p-3 border border-border rounded-md"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">{server.name}</span>
              <span className="text-xs opacity-50 bg-muted px-1.5 py-0.5 rounded">
                {server.transport}
              </span>
            </div>
            <p className="text-xs opacity-50 truncate mt-0.5">
              {server.transport === 'stdio'
                ? `${server.command} ${server.args ? JSON.parse(server.args).join(' ') : ''}`
                : server.url}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={server.enabled}
              onCheckedChange={(enabled) => handleToggle(server.id, enabled)}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => handleDelete(server.id)}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      ))}

      {showAddForm ? (
        <AddMcpServerForm onSubmit={handleAdd} onCancel={() => setShowAddForm(false)} />
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
          <Plus size={14} className="mr-1" />
          Add MCP Server
        </Button>
      )}
    </div>
  );
}

function AddMcpServerForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (config: Omit<McpServerConfig, 'id'>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [transport, setTransport] = useState<'stdio' | 'http'>('stdio');
  const [command, setCommand] = useState('');
  const [args, setArgs] = useState('');
  const [url, setUrl] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error('Server name is required');
      return;
    }

    if (transport === 'stdio' && !command.trim()) {
      toast.error('Command is required for stdio transport');
      return;
    }

    if (transport === 'http' && !url.trim()) {
      toast.error('URL is required for HTTP transport');
      return;
    }

    onSubmit({
      name: name.trim(),
      transport,
      command: transport === 'stdio' ? command.trim() : null,
      args: transport === 'stdio' && args.trim() ? JSON.stringify(args.trim().split(' ')) : null,
      url: transport === 'http' ? url.trim() : null,
      env: null,
      enabled: true,
    });
  };

  return (
    <div className="border border-border rounded-md p-4 space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Server name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1"
        />
        <Select value={transport} onValueChange={(v) => setTransport(v as 'stdio' | 'http')}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stdio">stdio</SelectItem>
            <SelectItem value="http">HTTP</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {transport === 'stdio' ? (
        <div className="flex gap-2">
          <Input
            placeholder="Command (e.g., npx)"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            className="w-1/3"
          />
          <Input
            placeholder="Arguments (e.g., -y @modelcontextprotocol/server-filesystem /tmp)"
            value={args}
            onChange={(e) => setArgs(e.target.value)}
            className="flex-1"
          />
        </div>
      ) : (
        <Input
          placeholder="Server URL (e.g., http://localhost:3001/mcp)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSubmit}>
          Add Server
        </Button>
      </div>
    </div>
  );
}
