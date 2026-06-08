import { useState, type ReactNode } from 'react'
import { HelpCircle, ChevronRight, Copy, Check } from 'lucide-react'
import { Button } from './base/Button'
import { CollapsibleSection } from './base/CollapsibleSection'

const SQL_SNIPPET = `-- NTE Flowboard 云同步配置
-- 在 Supabase SQL Editor 中执行以下语句

-- 1. 创建数据表
CREATE TABLE sync_data (
  id TEXT PRIMARY KEY DEFAULT 'NTE Flowboard',
  data TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. 启用 Row Level Security
ALTER TABLE sync_data ENABLE ROW LEVEL SECURITY;

-- 3. 创建 RLS 策略
-- 注意：直接的表操作将被 RLS 拒绝，
-- 所有操作必须通过 upsert_sync / pull_sync 函数执行

CREATE POLICY "Allow RPC" ON sync_data
  FOR ALL USING (true)
  WITH CHECK (true);

-- 4. 推送函数
CREATE OR REPLACE FUNCTION upsert_sync(
  p_data TEXT
) RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
BEGIN
  INSERT INTO sync_data (id, data, updated_at)
  VALUES ('NTE Flowboard', p_data, v_now)
  ON CONFLICT (id) DO UPDATE SET
    data = EXCLUDED.data,
    updated_at = EXCLUDED.updated_at;

  RETURN v_now;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 拉取函数
CREATE OR REPLACE FUNCTION pull_sync()
RETURNS TABLE(data TEXT, updated_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT sd.data, sd.updated_at
  FROM sync_data sd
  WHERE sd.id = 'NTE Flowboard';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 启用 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE sync_data;`

export function CloudSyncHelp() {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(SQL_SNIPPET)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <CollapsibleSection
      icon={<HelpCircle className="size-4 text-text-muted" />}
      label="如何获取配置信息"
      variant="elevated"
    >
      <div className="px-4 pb-4 text-[13px] text-text-secondary leading-relaxed space-y-3">
          <div>
            <p className="font-medium text-text-primary mb-1">1. 创建 Supabase 项目</p>
            <p>
              访问{' '}
              <a
                href="https://supabase.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-hover underline underline-offset-2"
              >
                supabase.com
              </a>{' '}
              注册并创建一个免费项目
            </p>
          </div>
          <div>
            <p className="font-medium text-text-primary mb-1">2. 创建数据表</p>
            <p className="mb-2">进入 SQL Editor，执行以下语句：</p>
            <div className="relative bg-background rounded-lg overflow-hidden border border-border">
              <div className="flex items-center justify-between px-3 py-1.5 bg-surface border-b border-border">
                <span className="text-[10px] text-text-muted font-medium">SQL</span>
                <Button
                  variant="tertiary"
                  onClick={handleCopy}
                  className="px-1 py-0.5 text-[10px] justify-center"
                >
                  {copied ? (
                    <Check className="size-3 text-success" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                  {copied ? '已复制' : '复制'}
                </Button>
              </div>
              <pre className="p-3 overflow-x-auto text-[10px] font-mono text-text-secondary leading-relaxed max-h-48">
                {SQL_SNIPPET}
              </pre>
            </div>
          </div>
          <div>
            <p className="font-medium text-text-primary mb-1">3. 获取项目 ID</p>
            <div className="flex items-center gap-1 text-[12px] text-text-secondary flex-wrap">
              <Path>Project Settings</Path>
              <ChevronRight className="size-3 text-text-muted" />
              <Path>General</Path>
              <ChevronRight className="size-3 text-text-muted" />
              <Path>Project ID</Path>
            </div>
          </div>
          <div>
            <p className="font-medium text-text-primary mb-1">4. 获取 Anon Key</p>
            <div className="flex items-center gap-1 text-[12px] text-text-secondary flex-wrap">
              <Path>Project Settings</Path>
              <ChevronRight className="size-3 text-text-muted" />
              <Path>API Keys</Path>
              <ChevronRight className="size-3 text-text-muted" />
              <Path>Legacy anon</Path>
              <ChevronRight className="size-3 text-text-muted" />
              <Path>anon public</Path>
            </div>
          </div>
          <div>
            <p className="font-medium text-text-primary mb-1">5. 完成</p>
            <p>回到网站输入 Project ID 和 Anon Key 即可连接</p>
          </div>
        </div>
    </CollapsibleSection>
  )
}

function Path({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-elevated text-[11px] font-mono text-text-primary border border-border">
      {children}
    </span>
  )
}
