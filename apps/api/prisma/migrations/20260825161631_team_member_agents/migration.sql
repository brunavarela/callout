-- Agentes principais de cada membro (até 3, uuid do AgentAsset) — editável
-- pelo grupo, mesmo padrão de "nota" e "funcao".
ALTER TABLE "team_members" ADD COLUMN "mainAgentUuids" TEXT[] NOT NULL DEFAULT '{}';
